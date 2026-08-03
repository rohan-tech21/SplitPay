#[cfg(test)]
mod test {
    use soroban_sdk::{Env, Address, String, Vec, testutils::Address as _, token};
    use group_manager::{GroupManager, GroupManagerClient};
    use expense_manager::{ExpenseManager, ExpenseManagerClient, SplitDetail};
    use crate::{SettlementManager, SettlementManagerClient, Error};

    fn setup_test_env<'a>() -> (
        Env,
        Address,
        Address,
        Address,
        Address,
        Address,
        GroupManagerClient<'a>,
        ExpenseManagerClient<'a>,
        SettlementManagerClient<'a>,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        // Generate accounts
        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        // Register contracts
        let group_mgr_id = env.register_contract(None, GroupManager);
        let expense_mgr_id = env.register_contract(None, ExpenseManager);
        let settle_mgr_id = env.register_contract(None, SettlementManager);

        let group_mgr_client = GroupManagerClient::new(&env, &group_mgr_id);
        let expense_mgr_client = ExpenseManagerClient::new(&env, &expense_mgr_id);
        let settle_mgr_client = SettlementManagerClient::new(&env, &settle_mgr_id);

        // Initialize SettlementManager
        settle_mgr_client.initialize(&admin, &group_mgr_id, &expense_mgr_id);

        (
            env,
            admin,
            alice,
            bob,
            charlie,
            settle_mgr_id,
            group_mgr_client,
            expense_mgr_client,
            settle_mgr_client,
        )
    }

    #[test]
    fn test_group_creation_and_membership() {
        let (env, _, alice, bob, charlie, _, group_mgr_client, _, _) = setup_test_env();

        // Alice creates a group
        let group_name = String::from_str(&env, "Goa Trip");
        let group_id = group_mgr_client.create_group(&alice, &group_name);
        assert_eq!(group_id, 1);

        // Verify Alice is a member
        assert!(group_mgr_client.is_member(&group_id, &alice));
        assert!(!group_mgr_client.is_member(&group_id, &bob));

        // Bob joins
        group_mgr_client.join_group(&group_id, &bob);
        assert!(group_mgr_client.is_member(&group_id, &bob));

        // Charlie joins
        group_mgr_client.join_group(&group_id, &charlie);

        let members = group_mgr_client.get_members(&group_id);
        assert_eq!(members.len(), 3);
        assert_eq!(members.get(0).unwrap(), alice);
        assert_eq!(members.get(1).unwrap(), bob);
        assert_eq!(members.get(2).unwrap(), charlie);
    }

    #[test]
    fn test_equal_split_expense() {
        let (env, _, alice, bob, charlie, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);
        group_mgr_client.join_group(&group_id, &charlie);

        // Alice pays 300 XLM, split equally between Alice, Bob, and Charlie (100 each)
        let splits = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 0 },
            SplitDetail { member: bob.clone(), value: 0 },
            SplitDetail { member: charlie.clone(), value: 0 },
        ]);

        let expense_id = expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Rent"),
            &300,
            &alice,
            &0, // Equal split
            &splits,
        );

        assert_eq!(expense_id, 1);

        // Verify debts recorded: Bob owes Alice 100, Charlie owes Alice 100
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 100);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &charlie, &alice), 100);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &alice, &bob), 0);
    }

    #[test]
    fn test_percentage_split_expense() {
        let (env, _, alice, bob, _, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);

        // Alice pays 200, split: Alice 60% (6000 bps), Bob 40% (4000 bps)
        let splits = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 6000 },
            SplitDetail { member: bob.clone(), value: 4000 },
        ]);

        expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Dinner"),
            &200,
            &alice,
            &1, // Percentage split
            &splits,
        );

        // Bob owes Alice 40% of 200 = 80
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 80);
    }

    #[test]
    fn test_custom_split_expense() {
        let (env, _, alice, bob, charlie, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);
        group_mgr_client.join_group(&group_id, &charlie);

        // Alice pays 150, split: Alice 30, Bob 50, Charlie 70
        let splits = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 30 },
            SplitDetail { member: bob.clone(), value: 50 },
            SplitDetail { member: charlie.clone(), value: 70 },
        ]);

        expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Drinks"),
            &150,
            &alice,
            &2, // Custom split
            &splits,
        );

        // Bob owes Alice 50, Charlie owes Alice 70
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 50);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &charlie, &alice), 70);
    }

    #[test]
    fn test_debt_netting() {
        let (env, _, alice, bob, _, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);

        // 1. Alice pays 100, split equally (50 each). Bob owes Alice 50.
        let splits_1 = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 0 },
            SplitDetail { member: bob.clone(), value: 0 },
        ]);
        expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Expense 1"),
            &100,
            &alice,
            &0,
            &splits_1,
        );

        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 50);

        // 2. Bob pays 150, split equally (75 each). Alice owes Bob 75.
        // Net: Alice should owe Bob 75 - 50 = 25. Bob should owe Alice 0.
        let splits_2 = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 0 },
            SplitDetail { member: bob.clone(), value: 0 },
        ]);
        expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Expense 2"),
            &150,
            &bob,
            &0,
            &splits_2,
        );

        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 0);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &alice, &bob), 25);
    }

    #[test]
    fn test_manual_settlement() {
        let (env, _, alice, bob, _, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);

        // Alice pays 100, Bob owes Alice 50
        let splits = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 0 },
            SplitDetail { member: bob.clone(), value: 0 },
        ]);
        expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Lunch"),
            &100,
            &alice,
            &0,
            &splits,
        );

        // Alice confirms Bob paid her 30 XLM. Debt should reduce to 20.
        settle_mgr_client.settle_debt_manual(&group_id, &bob, &alice, &30);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 20);

        // Alice confirms Bob paid remainder 20 XLM. Debt should be 0.
        settle_mgr_client.settle_debt_manual(&group_id, &bob, &alice, &20);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 0);
    }

    #[test]
    fn test_expense_deletion_and_debt_reversal() {
        let (env, _, alice, bob, _, settle_mgr_id, group_mgr_client, expense_mgr_client, settle_mgr_client) = setup_test_env();

        let group_id = group_mgr_client.create_group(&alice, &String::from_str(&env, "Flat"));
        group_mgr_client.join_group(&group_id, &bob);

        // Alice pays 100, Bob owes Alice 50
        let splits = Vec::from_array(&env, [
            SplitDetail { member: alice.clone(), value: 0 },
            SplitDetail { member: bob.clone(), value: 0 },
        ]);
        let expense_id = expense_mgr_client.add_expense(
            &group_mgr_client.address,
            &settle_mgr_id,
            &group_id,
            &String::from_str(&env, "Lunch"),
            &100,
            &alice,
            &0,
            &splits,
        );

        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 50);

        // Alice deletes the expense. Debt should be reversed to 0.
        expense_mgr_client.delete_expense(&settle_mgr_id, &group_id, &expense_id, &alice);
        assert_eq!(settle_mgr_client.get_debt(&group_id, &bob, &alice), 0);
    }
}
