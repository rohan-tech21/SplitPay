#![no_std]
#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Env, Address, String, Vec, Symbol, symbol_short};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GroupNotFound = 1,
    AlreadyMember = 2,
    NotAMember = 3,
    CreatorCannotLeave = 4,
}

#[derive(Clone)]
#[contracttype]
pub struct Group {
    pub id: u32,
    pub name: String,
    pub creator: Address,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    GroupCount,
    GroupInfo(u32),
    GroupMembers(u32),
}

#[contract]
pub struct GroupManager;

#[contractimpl]
impl GroupManager {
    // Create a new group
    pub fn create_group(env: Env, creator: Address, name: String) -> u32 {
        creator.require_auth();

        let mut count: u32 = env.storage().instance().get(&DataKey::GroupCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::GroupCount, &count);

        let group = Group {
            id: count,
            name: name.clone(),
            creator: creator.clone(),
        };

        env.storage().persistent().set(&DataKey::GroupInfo(count), &group);

        let mut members = Vec::new(&env);
        members.push_back(creator.clone());
        env.storage().persistent().set(&DataKey::GroupMembers(count), &members);

        // Emit group created event
        env.events().publish(
            (symbol_short!("grp_cred"), count),
            (creator, name),
        );

        count
    }

    // Join an existing group
    pub fn join_group(env: Env, group_id: u32, member: Address) -> Result<(), Error> {
        member.require_auth();

        if !env.storage().persistent().has(&DataKey::GroupInfo(group_id)) {
            return Err(Error::GroupNotFound);
        }

        let mut members: Vec<Address> = env.storage().persistent().get(&DataKey::GroupMembers(group_id)).unwrap();
        
        let mut is_already_member = false;
        for i in 0..members.len() {
            if members.get(i).unwrap() == member {
                is_already_member = true;
                break;
            }
        }

        if is_already_member {
            return Err(Error::AlreadyMember);
        }

        members.push_back(member.clone());
        env.storage().persistent().set(&DataKey::GroupMembers(group_id), &members);

        // Emit member joined event
        env.events().publish(
            (symbol_short!("mem_join"), group_id),
            member,
        );

        Ok(())
    }

    // Leave a group
    pub fn leave_group(env: Env, group_id: u32, member: Address) -> Result<(), Error> {
        member.require_auth();

        if !env.storage().persistent().has(&DataKey::GroupInfo(group_id)) {
            return Err(Error::GroupNotFound);
        }

        let group: Group = env.storage().persistent().get(&DataKey::GroupInfo(group_id)).unwrap();
        if group.creator == member {
            return Err(Error::CreatorCannotLeave);
        }

        let mut members: Vec<Address> = env.storage().persistent().get(&DataKey::GroupMembers(group_id)).unwrap();
        let mut index = None;
        for i in 0..members.len() {
            if members.get(i).unwrap() == member {
                index = Some(i);
                break;
            }
        }

        match index {
            Some(i) => {
                members.remove(i);
                env.storage().persistent().set(&DataKey::GroupMembers(group_id), &members);
                
                // Emit member left event
                env.events().publish(
                    (symbol_short!("mem_left"), group_id),
                    member,
                );
                Ok(())
            }
            None => Err(Error::NotAMember),
        }
    }

    // Check if member is in group
    pub fn is_member(env: Env, group_id: u32, member: Address) -> bool {
        if !env.storage().persistent().has(&DataKey::GroupInfo(group_id)) {
            return false;
        }
        let members: Vec<Address> = env.storage().persistent().get(&DataKey::GroupMembers(group_id)).unwrap_or_else(|| Vec::new(&env));
        
        let mut found = false;
        for i in 0..members.len() {
            if members.get(i).unwrap() == member {
                found = true;
                break;
            }
        }
        found
    }

    // Get list of group members
    pub fn get_members(env: Env, group_id: u32) -> Result<Vec<Address>, Error> {
        if !env.storage().persistent().has(&DataKey::GroupInfo(group_id)) {
            return Err(Error::GroupNotFound);
        }
        Ok(env.storage().persistent().get(&DataKey::GroupMembers(group_id)).unwrap())
    }

    // Get group info
    pub fn get_group(env: Env, group_id: u32) -> Result<Group, Error> {
        if !env.storage().persistent().has(&DataKey::GroupInfo(group_id)) {
            return Err(Error::GroupNotFound);
        }
        Ok(env.storage().persistent().get(&DataKey::GroupInfo(group_id)).unwrap())
    }

    // Get group count
    pub fn get_group_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::GroupCount).unwrap_or(0)
    }
}
