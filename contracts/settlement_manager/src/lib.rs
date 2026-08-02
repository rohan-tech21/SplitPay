#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Env, Address, Vec, Symbol, symbol_short};

#[soroban_sdk::contractclient(name = "GroupManagerClient")]
pub trait GroupManager {
    fn is_member(env: Env, group_id: u32, member: Address) -> bool;
    fn get_members(env: Env, group_id: u32) -> Vec<Address>;
}

#[soroban_sdk::contractclient(name = "TokenClient")]
pub trait Token {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    NotGroupMember = 4,
    InsufficientDebt = 5,
    SelfSettlement = 6,
}

#[derive(Clone)]
#[contracttype]
pub struct DebtDetail {
    pub debtor: Address,
    pub creditor: Address,
    pub amount: i128,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Initialized,
    Admin,
    GroupManager,
    ExpenseManager,
    Debt(u32, Address, Address), // group_id, debtor, creditor -> amount
}

#[contract]
pub struct SettlementManager;

#[contractimpl]
impl SettlementManager {
    // Initialize the contract
    pub fn initialize(
        env: Env,
        admin: Address,
        group_mgr: Address,
        expense_mgr: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::GroupManager, &group_mgr);
        env.storage().instance().set(&DataKey::ExpenseManager, &expense_mgr);
        Ok(())
    }

    // Record a debt (only callable by ExpenseManager)
    pub fn record_debt(
        env: Env,
        caller: Address,
        group_id: u32,
        debtor: Address,
        creditor: Address,
        amount: i128,
    ) -> Result<(), Error> {
        caller.require_auth();

        // Ensure contract is initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        // Verify caller is the registered ExpenseManager
        let registered_expense_mgr: Address = env.storage().instance().get(&DataKey::ExpenseManager).unwrap();
        if caller != registered_expense_mgr {
            return Err(Error::Unauthorized);
        }

        if debtor == creditor {
            return Err(Error::SelfSettlement);
        }

        // Netting logic:
        // Check if creditor owes debtor
        let reverse_key = DataKey::Debt(group_id, creditor.clone(), debtor.clone());
        let reverse_debt: i128 = env.storage().persistent().get(&reverse_key).unwrap_or(0);

        if reverse_debt > 0 {
            if reverse_debt > amount {
                let new_reverse_debt = reverse_debt - amount;
                env.storage().persistent().set(&reverse_key, &new_reverse_debt);
            } else if reverse_debt == amount {
                env.storage().persistent().remove(&reverse_key);
            } else {
                let remaining_amount = amount - reverse_debt;
                env.storage().persistent().remove(&reverse_key);
                let direct_key = DataKey::Debt(group_id, debtor.clone(), creditor.clone());
                let current_debt: i128 = env.storage().persistent().get(&direct_key).unwrap_or(0);
                env.storage().persistent().set(&direct_key, &(current_debt + remaining_amount));
            }
        } else {
            let direct_key = DataKey::Debt(group_id, debtor.clone(), creditor.clone());
            let current_debt: i128 = env.storage().persistent().get(&direct_key).unwrap_or(0);
            env.storage().persistent().set(&direct_key, &(current_debt + amount));
        }

        // Emit debt updated event
        env.events().publish(
            (symbol_short!("debt_rec"), group_id),
            (debtor, creditor, amount),
        );

        Ok(())
    }

    // Reduce a debt (e.g. when an expense is deleted; only callable by ExpenseManager)
    pub fn reduce_debt(
        env: Env,
        caller: Address,
        group_id: u32,
        debtor: Address,
        creditor: Address,
        amount: i128,
    ) -> Result<(), Error> {
        caller.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        let registered_expense_mgr: Address = env.storage().instance().get(&DataKey::ExpenseManager).unwrap();
        if caller != registered_expense_mgr {
            return Err(Error::Unauthorized);
        }

        let direct_key = DataKey::Debt(group_id, debtor.clone(), creditor.clone());
        let current_debt: i128 = env.storage().persistent().get(&direct_key).unwrap_or(0);

        if current_debt >= amount {
            let new_debt = current_debt - amount;
            if new_debt > 0 {
                env.storage().persistent().set(&direct_key, &new_debt);
            } else {
                env.storage().persistent().remove(&direct_key);
            }
        } else {
            // If the direct debt is less than the reduction amount, it means netting had occurred
            // or state is inconsistent. We can remove the direct debt and record the remainder as a reverse debt.
            let remainder = amount - current_debt;
            env.storage().persistent().remove(&direct_key);
            
            let reverse_key = DataKey::Debt(group_id, creditor.clone(), debtor.clone());
            let reverse_debt: i128 = env.storage().persistent().get(&reverse_key).unwrap_or(0);
            env.storage().persistent().set(&reverse_key, &(reverse_debt + remainder));
        }

        env.events().publish(
            (symbol_short!("debt_red"), group_id),
            (debtor, creditor, amount),
        );

        Ok(())
    }

    // Manual debt settlement: creditor confirms they received payment from debtor
    pub fn settle_debt_manual(
        env: Env,
        group_id: u32,
        debtor: Address,
        creditor: Address,
        amount: i128,
    ) -> Result<(), Error> {
        creditor.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        let group_mgr: Address = env.storage().instance().get(&DataKey::GroupManager).unwrap();
        let group_mgr_client = GroupManagerClient::new(&env, &group_mgr);

        if !group_mgr_client.is_member(&group_id, &debtor) || !group_mgr_client.is_member(&group_id, &creditor) {
            return Err(Error::NotGroupMember);
        }

        let key = DataKey::Debt(group_id, debtor.clone(), creditor.clone());
        let current_debt: i128 = env.storage().persistent().get(&key).unwrap_or(0);

        if current_debt < amount {
            return Err(Error::InsufficientDebt);
        }

        let new_debt = current_debt - amount;
        if new_debt > 0 {
            env.storage().persistent().set(&key, &new_debt);
        } else {
            env.storage().persistent().remove(&key);
        }

        // Emit settlement event
        env.events().publish(
            (symbol_short!("settle_m"), group_id),
            (debtor, creditor, amount),
        );

        Ok(())
    }

    // Token debt settlement: debtor pays creditor via native/custom Soroban token transfer
    pub fn settle_debt_token(
        env: Env,
        token: Address,
        group_id: u32,
        debtor: Address,
        creditor: Address,
        amount: i128,
    ) -> Result<(), Error> {
        debtor.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        let group_mgr: Address = env.storage().instance().get(&DataKey::GroupManager).unwrap();
        let group_mgr_client = GroupManagerClient::new(&env, &group_mgr);

        if !group_mgr_client.is_member(&group_id, &debtor) || !group_mgr_client.is_member(&group_id, &creditor) {
            return Err(Error::NotGroupMember);
        }

        let key = DataKey::Debt(group_id, debtor.clone(), creditor.clone());
        let current_debt: i128 = env.storage().persistent().get(&key).unwrap_or(0);

        if current_debt < amount {
            return Err(Error::InsufficientDebt);
        }

        // Perform token transfer from debtor to creditor
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&debtor, &creditor, &amount);

        let new_debt = current_debt - amount;
        if new_debt > 0 {
            env.storage().persistent().set(&key, &new_debt);
        } else {
            env.storage().persistent().remove(&key);
        }

        // Emit settlement event
        env.events().publish(
            (symbol_short!("settle_t"), group_id),
            (debtor, creditor, amount),
        );

        Ok(())
    }

    // Get specific debt
    pub fn get_debt(env: Env, group_id: u32, debtor: Address, creditor: Address) -> i128 {
        let key = DataKey::Debt(group_id, debtor, creditor);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    // Get all group debts by querying members list from GroupManager
    pub fn get_group_debts(env: Env, group_id: u32) -> Result<Vec<DebtDetail>, Error> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        let group_mgr: Address = env.storage().instance().get(&DataKey::GroupManager).unwrap();
        let group_mgr_client = GroupManagerClient::new(&env, &group_mgr);

        // Fetch members from GroupManager
        let members = group_mgr_client.get_members(&group_id);
        let mut debts = Vec::new(&env);

        // Compute pairwise debts
        for i in 0..members.len() {
            let debtor = members.get(i).unwrap();
            for j in 0..members.len() {
                if i == j {
                    continue;
                }
                let creditor = members.get(j).unwrap();
                let amount = Self::get_debt(env.clone(), group_id, debtor.clone(), creditor.clone());
                if amount > 0 {
                    debts.push_back(DebtDetail {
                        debtor: debtor.clone(),
                        creditor: creditor.clone(),
                        amount,
                    });
                }
            }
        }

        Ok(debts)
    }
}

mod test;
