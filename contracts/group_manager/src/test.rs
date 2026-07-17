#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, String};
use soroban_sdk::testutils::Address as _;

#[test]
fn test_create_group() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, GroupManager);
    let client = GroupManagerClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let name = String::from_str(&env, "SplitPay Test Group");

    let group_id = client.create_group(&creator, &name);
    assert_eq!(group_id, 1);
    assert_eq!(client.get_group_count(), 1);

    let group = client.get_group(&1);
    assert_eq!(group.creator, creator);
    assert_eq!(group.name, name);
    assert_eq!(group.id, 1);
}

#[test]
fn test_join_and_leave_group() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, GroupManager);
    let client = GroupManagerClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let name = String::from_str(&env, "SplitPay Test Group");

    let group_id = client.create_group(&creator, &name);
    
    let member = Address::generate(&env);
    
    // Join Group
    client.join_group(&group_id, &member);
    assert!(client.is_member(&group_id, &member));

    // Get members
    let members = client.get_members(&group_id);
    assert_eq!(members.len(), 2);

    // Leave Group
    client.leave_group(&group_id, &member);
    assert!(!client.is_member(&group_id, &member));
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #4)")] // CreatorCannotLeave = 4
fn test_creator_cannot_leave() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, GroupManager);
    let client = GroupManagerClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let name = String::from_str(&env, "SplitPay Test Group");

    let group_id = client.create_group(&creator, &name);
    client.leave_group(&group_id, &creator);
}
