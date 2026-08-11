#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, String, Vec, vec};
use soroban_sdk::testutils::Address as _;

#[contract]
pub struct MockGroupManager;

#[contractimpl]
impl MockGroupManager {
    pub fn is_member(_env: Env, _group_id: u32, _member: Address) -> bool {
        true
    }
    pub fn get_members(env: Env, _group_id: u32) -> Vec<Address> {
        Vec::new(&env)
    }
}

#[contract]
pub struct MockSettlementManager;

#[contractimpl]
impl MockSettlementManager {
    pub fn record_debt(_env: Env, _caller: Address, _group_id: u32, _debtor: Address, _creditor: Address, _amount: i128) {}
    pub fn reduce_debt(_env: Env, _caller: Address, _group_id: u32, _debtor: Address, _creditor: Address, _amount: i128) {}
}

#[test]
fn test_add_and_get_expense_equal_split() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ExpenseManager);
    let client = ExpenseManagerClient::new(&env, &contract_id);

    let group_mgr_id = env.register_contract(None, MockGroupManager);
    let settle_mgr_id = env.register_contract(None, MockSettlementManager);

    let payer = Address::generate(&env);
    let member_b = Address::generate(&env);

    let splits = vec![
        &env,
        SplitDetail { member: payer.clone(), value: 5000 }, // $50.00
        SplitDetail { member: member_b.clone(), value: 5000 }, // $50.00
    ];

    let expense_id = client.add_expense(
        &group_mgr_id,
        &settle_mgr_id,
        &1, // group_id
        &String::from_str(&env, "Dinner"),
        &10000, // $100.00 total
        &payer,
        &0, // Equal split type
        &splits
    );

    assert_eq!(expense_id, 1);

    let expense = client.get_expense(&1, &1);
    assert_eq!(expense.amount, 10000);
    assert_eq!(expense.paid_by, payer);
    assert_eq!(expense.description, String::from_str(&env, "Dinner"));
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")] // InvalidSplitSum = 3
fn test_invalid_split_sum() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ExpenseManager);
    let client = ExpenseManagerClient::new(&env, &contract_id);

    let group_mgr_id = env.register_contract(None, MockGroupManager);
    let settle_mgr_id = env.register_contract(None, MockSettlementManager);

    let payer = Address::generate(&env);

    let splits = vec![
        &env,
        SplitDetail { member: payer.clone(), value: 3000 },
    ];

    // Total amount is 10000, but sum of splits is 3000 -> Should panic
    client.add_expense(
        &group_mgr_id,
        &settle_mgr_id,
        &1,
        &String::from_str(&env, "Dinner"),
        &10000,
        &payer,
        &2, // Custom split type
        &splits
    );
}

#[test]
fn test_delete_expense() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ExpenseManager);
    let client = ExpenseManagerClient::new(&env, &contract_id);

    let group_mgr_id = env.register_contract(None, MockGroupManager);
    let settle_mgr_id = env.register_contract(None, MockSettlementManager);

    let payer = Address::generate(&env);
    let splits = vec![
        &env,
        SplitDetail { member: payer.clone(), value: 10000 },
    ];

    let expense_id = client.add_expense(
        &group_mgr_id,
        &settle_mgr_id,
        &1,
        &String::from_str(&env, "Dinner"),
        &10000,
        &payer,
        &2,
        &splits
    );

    client.delete_expense(&settle_mgr_id, &1, &expense_id, &payer);

    // After deleting, trying to retrieve should panic GroupNotFound / ExpenseNotFound
}
