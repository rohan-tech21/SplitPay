#![no_std]
#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Env, Address, String, Vec, Symbol, symbol_short};

#[soroban_sdk::contractclient(name = "GroupManagerClient")]
pub trait GroupManager {
    fn is_member(env: Env, group_id: u32, member: Address) -> bool;
    fn get_members(env: Env, group_id: u32) -> Vec<Address>;
}

#[soroban_sdk::contractclient(name = "SettlementManagerClient")]
pub trait SettlementManager {
    fn record_debt(env: Env, caller: Address, group_id: u32, debtor: Address, creditor: Address, amount: i128);
    fn reduce_debt(env: Env, caller: Address, group_id: u32, debtor: Address, creditor: Address, amount: i128);
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ExpenseNotFound = 1,
    NotGroupMember = 2,
    InvalidSplitSum = 3,
    InvalidSplitType = 4,
    Unauthorized = 5,
    EmptySplits = 6,
}

#[derive(Clone)]
#[contracttype]
pub struct SplitDetail {
    pub member: Address,
    pub value: i128, // represent amount in cents or percentage (bps)
}

#[derive(Clone)]
#[contracttype]
pub struct Expense {
    pub id: u32,
    pub group_id: u32,
    pub description: String,
    pub amount: i128,
    pub paid_by: Address,
    pub split_type: u32, // 0: Equal, 1: Percentage (basis points), 2: Custom (exact amounts)
    pub splits: Vec<SplitDetail>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    ExpenseCount(u32), // group_id -> count
    ExpenseInfo(u32, u32), // group_id, expense_id -> Expense
    GroupExpenses(u32), // group_id -> Vec<u32> (expense_ids)
}

#[contract]
pub struct ExpenseManager;

#[contractimpl]
impl ExpenseManager {
    // Add a new expense
    pub fn add_expense(
        env: Env,
        group_mgr: Address,
        settle_mgr: Address,
        group_id: u32,
        description: String,
        amount: i128,
        paid_by: Address,
        split_type: u32,
        splits: Vec<SplitDetail>,
    ) -> Result<u32, Error> {
        paid_by.require_auth();

        // 1. Verify payer is a member of the group
        let group_mgr_client = GroupManagerClient::new(&env, &group_mgr);
        if !group_mgr_client.is_member(&group_id, &paid_by) {
            return Err(Error::NotGroupMember);
        }

        if splits.is_empty() {
            return Err(Error::EmptySplits);
        }

        // 2. Validate splits
        let mut processed_splits = Vec::new(&env);
        let settle_mgr_client = SettlementManagerClient::new(&env, &settle_mgr);

        if split_type == 0 {
            // Equal Split: ignore SplitDetail.value, divide equally
            let num_members = splits.len() as i128;
            let share = amount / num_members;
            let mut remainder = amount % num_members;

            for i in 0..splits.len() {
                let s = splits.get(i).unwrap();
                if !group_mgr_client.is_member(&group_id, &s.member) {
                    return Err(Error::NotGroupMember);
                }
                
                let mut member_share = share;
                if remainder > 0 {
                    member_share += 1;
                    remainder -= 1;
                }

                processed_splits.push_back(SplitDetail {
                    member: s.member.clone(),
                    value: member_share,
                });

                // Record debt in SettlementManager if they are not the payer
                if s.member != paid_by {
                    settle_mgr_client.record_debt(&env.current_contract_address(), &group_id, &s.member, &paid_by, &member_share);
                }
            }
        } else if split_type == 1 {
            // Percentage Split (value is in basis points, e.g. 2500 for 25.00%, total must be 10000)
            let mut total_pct = 0;
            for i in 0..splits.len() {
                let s = splits.get(i).unwrap();
                if !group_mgr_client.is_member(&group_id, &s.member) {
                    return Err(Error::NotGroupMember);
                }
                total_pct += s.value;
            }

            if total_pct != 10000 {
                return Err(Error::InvalidSplitSum);
            }

            let mut remaining_amount = amount;
            for i in 0..splits.len() {
                let s = splits.get(i).unwrap();
                let is_last = i == splits.len() - 1;
                
                let member_share = if is_last {
                    remaining_amount
                } else {
                    let share = (amount * s.value) / 10000;
                    remaining_amount -= share;
                    share
                };

                processed_splits.push_back(SplitDetail {
                    member: s.member.clone(),
                    value: member_share,
                });

                if s.member != paid_by {
                    settle_mgr_client.record_debt(&env.current_contract_address(), &group_id, &s.member, &paid_by, &member_share);
                }
            }
        } else if split_type == 2 {
            // Custom Split: values are exact amounts, sum must equal total amount
            let mut total_amount = 0;
            for i in 0..splits.len() {
                let s = splits.get(i).unwrap();
                if !group_mgr_client.is_member(&group_id, &s.member) {
                    return Err(Error::NotGroupMember);
                }
                total_amount += s.value;

                processed_splits.push_back(s.clone());

                if s.member != paid_by {
                    settle_mgr_client.record_debt(&env.current_contract_address(), &group_id, &s.member, &paid_by, &s.value);
                }
            }

            if total_amount != amount {
                return Err(Error::InvalidSplitSum);
            }
        } else {
            return Err(Error::InvalidSplitType);
        }

        // 3. Save Expense
        let mut count: u32 = env.storage().persistent().get(&DataKey::ExpenseCount(group_id)).unwrap_or(0);
        count += 1;
        env.storage().persistent().set(&DataKey::ExpenseCount(group_id), &count);

        let expense = Expense {
            id: count,
            group_id,
            description: description.clone(),
            amount,
            paid_by: paid_by.clone(),
            split_type,
            splits: processed_splits,
        };

        env.storage().persistent().set(&DataKey::ExpenseInfo(group_id, count), &expense);

        let mut group_exps: Vec<u32> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap_or_else(|| Vec::new(&env));
        group_exps.push_back(count);
        env.storage().persistent().set(&DataKey::GroupExpenses(group_id), &group_exps);

        // Emit Expense Added Event
        env.events().publish(
            (symbol_short!("exp_add"), group_id),
            (count, paid_by, amount, description),
        );

        Ok(count)
    }

    // Delete expense (which will reverse the debt)
    pub fn delete_expense(
        env: Env,
        settle_mgr: Address,
        group_id: u32,
        expense_id: u32,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();

        if !env.storage().persistent().has(&DataKey::ExpenseInfo(group_id, expense_id)) {
            return Err(Error::ExpenseNotFound);
        }

        let expense: Expense = env.storage().persistent().get(&DataKey::ExpenseInfo(group_id, expense_id)).unwrap();
        if expense.paid_by != caller {
            return Err(Error::Unauthorized);
        }

        let settle_mgr_client = SettlementManagerClient::new(&env, &settle_mgr);

        // Reverse all recorded debts
        for i in 0..expense.splits.len() {
            let s = expense.splits.get(i).unwrap();
            if s.member != expense.paid_by {
                settle_mgr_client.reduce_debt(&env.current_contract_address(), &group_id, &s.member, &expense.paid_by, &s.value);
            }
        }

        // Remove expense details
        env.storage().persistent().remove(&DataKey::ExpenseInfo(group_id, expense_id));

        // Remove from list
        let mut group_exps: Vec<u32> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap();
        let mut idx = None;
        for i in 0..group_exps.len() {
            if group_exps.get(i).unwrap() == expense_id {
                idx = Some(i);
                break;
            }
        }
        if let Some(i) = idx {
            group_exps.remove(i);
            env.storage().persistent().set(&DataKey::GroupExpenses(group_id), &group_exps);
        }

        // Emit Expense Deleted Event
        env.events().publish(
            (symbol_short!("exp_del"), group_id),
            expense_id,
        );

        Ok(())
    }

    // Get an expense
    pub fn get_expense(env: Env, group_id: u32, expense_id: u32) -> Result<Expense, Error> {
        if !env.storage().persistent().has(&DataKey::ExpenseInfo(group_id, expense_id)) {
            return Err(Error::ExpenseNotFound);
        }
        Ok(env.storage().persistent().get(&DataKey::ExpenseInfo(group_id, expense_id)).unwrap())
    }

    // Get all group expenses
    pub fn get_group_expenses(env: Env, group_id: u32) -> Vec<Expense> {
        let expense_ids: Vec<u32> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap_or_else(|| Vec::new(&env));
        let mut expenses = Vec::new(&env);
        for i in 0..expense_ids.len() {
            let id = expense_ids.get(i).unwrap();
            if let Some(exp) = env.storage().persistent().get(&DataKey::ExpenseInfo(group_id, id)) {
                expenses.push_back(exp);
            }
        }
        expenses
    }
}
