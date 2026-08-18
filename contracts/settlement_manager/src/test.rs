#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, Vec};
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
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
        // mock transfer succeeds
    }
}

#[test]
fn test_initialize_and_record_debt() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);

    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let debtor = Address::generate(&env);
    let creditor = Address::generate(&env);

    // Record debt: debtor owes creditor $10.00 (1000 cents)
    client.record_debt(&expense_mgr_id, &1, &debtor, &creditor, &1000);

    let debt = client.get_debt(&1, &debtor, &creditor);
    assert_eq!(debt, 1000);
}

#[test]
fn test_debt_netting() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);

    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Alice owes Bob $50.00
    client.record_debt(&expense_mgr_id, &1, &alice, &bob, &5000);
    assert_eq!(client.get_debt(&1, &alice, &bob), 5000);

    // Bob owes Alice $20.00
    client.record_debt(&expense_mgr_id, &1, &bob, &alice, &2000);
    
    // Netted result: Alice owes Bob $30.00, Bob owes Alice $0.00
    assert_eq!(client.get_debt(&1, &alice, &bob), 3000);
    assert_eq!(client.get_debt(&1, &bob, &alice), 0);
}

#[test]
fn test_settle_debt_manual() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);

    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let debtor = Address::generate(&env);
    let creditor = Address::generate(&env);

    client.record_debt(&expense_mgr_id, &1, &debtor, &creditor, &4000);
    assert_eq!(client.get_debt(&1, &debtor, &creditor), 4000);

    // Settle manual $30.00
    client.settle_debt_manual(&1, &debtor, &creditor, &3000);
    assert_eq!(client.get_debt(&1, &debtor, &creditor), 1000);
}

#[test]
fn test_settle_debt_token() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);
    let token_id = env.register(MockToken, ());

    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let debtor = Address::generate(&env);
    let creditor = Address::generate(&env);

    client.record_debt(&expense_mgr_id, &1, &debtor, &creditor, &6000);

    // Settle token $40.00
    client.settle_debt_token(&token_id, &1, &debtor, &creditor, &4000);
    assert_eq!(client.get_debt(&1, &debtor, &creditor), 2000);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #6)")] // SelfSettlement = 6
fn test_self_settlement_error() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);
    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let user = Address::generate(&env);
    client.settle_debt_manual(&1, &user, &user, &1000);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #5)")] // InsufficientDebt = 5
fn test_insufficient_debt_settlement() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);
    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let debtor = Address::generate(&env);
    let creditor = Address::generate(&env);

    client.record_debt(&expense_mgr_id, &1, &debtor, &creditor, &1000);

    // Trying to settle 2000 when debt is only 1000
    client.settle_debt_manual(&1, &debtor, &creditor, &2000);
}

#[test]
fn test_reduce_debt_reversal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SettlementManager, ());
    let client = SettlementManagerClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let group_mgr_id = env.register(MockGroupManager, ());
    let expense_mgr_id = Address::generate(&env);
    client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

    let debtor = Address::generate(&env);
    let creditor = Address::generate(&env);

    client.record_debt(&expense_mgr_id, &1, &debtor, &creditor, &5000);
    assert_eq!(client.get_debt(&1, &debtor, &creditor), 5000);

    client.reduce_debt(&expense_mgr_id, &1, &debtor, &creditor, &2000);
    assert_eq!(client.get_debt(&1, &debtor, &creditor), 3000);
}

