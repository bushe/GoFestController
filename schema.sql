CREATE TABLE IF NOT EXISTS `account` (
    `username` varchar(32) NOT NULL,
    `password` varchar(32) NOT NULL,
    `first_warning_timestamp` int(11) unsigned DEFAULT NULL,
    `failed_timestamp` int(11) unsigned DEFAULT NULL,
    `failed` varchar(32) DEFAULT NULL,
    `level` tinyint(3) unsigned NOT NULL DEFAULT 0,
    `last_encounter_lat` double(18,14) DEFAULT NULL,
    `last_encounter_lon` double(18,14) DEFAULT NULL,
    `last_encounter_time` int(11) unsigned DEFAULT NULL,
    `has_ticket` tinyint(3) unsigned DEFAULT 0,
    PRIMARY KEY (`username`)
);

CREATE TABLE IF NOT EXISTS `device` (
    `uuid` varchar(40) NOT NULL,
    `instance_name` varchar(30) DEFAULT NULL,
    `last_host` varchar(30) DEFAULT NULL,
    `last_seen` int(11) unsigned NOT NULL DEFAULT 0,
    `account_username` varchar(32) DEFAULT NULL,
    `last_lat` double DEFAULT 0,
    `last_lon` double DEFAULT 0,
    PRIMARY KEY (`uuid`),
    UNIQUE KEY `uk_iaccount_username` (`account_username`),
    CONSTRAINT `fk_account_username` FOREIGN KEY (`account_username`) REFERENCES `account` (`username`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `metadata` (
    `key` varchar(50) PRIMARY KEY NOT NULL,
    `value` varchar(50) DEFAULT NULL
);

INSERT IGNORE INTO `metadata` (`key`, `value`) VALUES ('DB_VERSION', 1);


-- Create the below tables for single database use --

CREATE TABLE IF NOT EXISTS `pokemon` (
    `id` varchar(25) NOT NULL,
    `pokestop_id` varchar(35) DEFAULT NULL,
    `spawn_id` bigint(15) unsigned DEFAULT NULL,
    `lat` double(18,14) NOT NULL,
    `lon` double(18,14) NOT NULL,
    `weight` double(18,14) DEFAULT NULL,
    `size` double(18,14) DEFAULT NULL,
    `expire_timestamp` int(11) unsigned DEFAULT NULL,
    `updated` int(11) unsigned DEFAULT NULL,
    `pokemon_id` smallint(6) unsigned NOT NULL,
    `move_1` smallint(6) unsigned DEFAULT NULL,
    `move_2` smallint(6) unsigned DEFAULT NULL,
    `gender` tinyint(3) unsigned DEFAULT NULL,
    `cp` smallint(6) unsigned DEFAULT NULL,
    `atk_iv` tinyint(3) unsigned DEFAULT NULL,
    `def_iv` tinyint(3) unsigned DEFAULT NULL,
    `sta_iv` tinyint(3) unsigned DEFAULT NULL,
    `form` smallint(5) unsigned DEFAULT NULL,
    `level` tinyint(3) unsigned DEFAULT NULL,
    `weather` tinyint(3) unsigned DEFAULT NULL,
    `costume` tinyint(3) unsigned DEFAULT NULL,
    `first_seen_timestamp` int(11) unsigned NOT NULL,
    `changed` int(11) unsigned NOT NULL DEFAULT 0,
    `iv` float(5,2) unsigned GENERATED ALWAYS AS ((`atk_iv` + `def_iv` + `sta_iv`) * 100 / 45) VIRTUAL,
    `cell_id` bigint(20) unsigned DEFAULT NULL,
    `expire_timestamp_verified` tinyint(1) unsigned NOT NULL,
    `shiny` tinyint(1) unsigned DEFAULT NULL,
    `username` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `display_pokemon_id` smallint(5) unsigned DEFAULT NULL,
    `capture_1` double(18,14) DEFAULT NULL,
    `capture_2` double(18,14) DEFAULT NULL,
    `capture_3` double(18,14) DEFAULT NULL,
    `pvp_rankings_great_league` text DEFAULT NULL,
    `pvp_rankings_ultra_league` text DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_coords` (`lat`,`lon`),
    KEY `ix_pokemon_id` (`pokemon_id`),
    KEY `ix_updated` (`updated`),
    KEY `fk_spawn_id` (`spawn_id`),
    KEY `fk_pokestop_id` (`pokestop_id`),
    KEY `ix_iv` (`iv`),
    KEY `ix_atk_iv` (`atk_iv`),
    KEY `ix_def_iv` (`def_iv`),
    KEY `ix_sta_iv` (`sta_iv`),
    KEY `ix_changed` (`changed`),
    KEY `ix_level` (`level`),
    KEY `fk_pokemon_cell_id` (`cell_id`),
    KEY `ix_expire_timestamp` (`expire_timestamp`),
    CONSTRAINT `fk_pokemon_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pokestop_id` FOREIGN KEY (`pokestop_id`) REFERENCES `pokestop` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_spawn_id` FOREIGN KEY (`spawn_id`) REFERENCES `spawnpoint` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `pokestop` (
    `id` varchar(35) NOT NULL,
    `lat` double(18,14) NOT NULL,
    `lon` double(18,14) NOT NULL,
    `name` varchar(128) COLLATE DEFAULT NULL,
    `url` varchar(200) COLLATE DEFAULT NULL,
    `lure_expire_timestamp` int(11) unsigned DEFAULT NULL,
    `last_modified_timestamp` int(11) unsigned DEFAULT NULL,
    `updated` int(11) unsigned NOT NULL,
    `enabled` tinyint(1) unsigned DEFAULT NULL,
    `quest_type` int(11) unsigned DEFAULT NULL,
    `quest_timestamp` int(11) unsigned DEFAULT NULL,
    `quest_target` smallint(6) unsigned DEFAULT NULL,
    `quest_conditions` text DEFAULT NULL,
    `quest_rewards` text DEFAULT NULL,
    `quest_template` varchar(100) DEFAULT NULL,
    `quest_pokemon_id` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,'$[*].info.pokemon_id'),'$[0]')) VIRTUAL,
    `quest_reward_type` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,'$[*].type'),'$[0]')) VIRTUAL,
    `quest_item_id` smallint(6) unsigned GENERATED ALWAYS AS (json_extract(json_extract(`quest_rewards`,'$[*].info.item_id'),'$[0]')) VIRTUAL,
    `cell_id` bigint(20) unsigned DEFAULT NULL,
    `deleted` tinyint(1) unsigned NOT NULL DEFAULT 0,
    `lure_id` smallint(5) DEFAULT 0,
    `pokestop_display` smallint(5) DEFAULT 0,
    `incident_expire_timestamp` int(11) unsigned DEFAULT NULL,
    `grunt_type` smallint(5) unsigned DEFAULT 0,
    `first_seen_timestamp` int(11) unsigned NOT NULL,
    `sponsor_id` smallint(5) unsigned DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_coords` (`lat`,`lon`),
    KEY `ix_lure_expire_timestamp` (`lure_expire_timestamp`),
    KEY `ix_updated` (`updated`),
    KEY `ix_quest_pokemon_id` (`quest_pokemon_id`),
    KEY `ix_quest_reward_type` (`quest_reward_type`),
    KEY `ix_quest_item_id` (`quest_item_id`),
    KEY `fk_pokestop_cell_id` (`cell_id`),
    KEY `ix_pokestop_deleted` (`deleted`),
    KEY `ix_incident_expire_timestamp` (`incident_expire_timestamp`),
    CONSTRAINT `fk_pokestop_cell_id` FOREIGN KEY (`cell_id`) REFERENCES `s2cell` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `s2cell` (
    `id` bigint(20) unsigned NOT NULL,
    `level` tinyint(3) unsigned DEFAULT NULL,
    `center_lat` double(18,14) NOT NULL DEFAULT 0.00000000000000,
    `center_lon` double(18,14) NOT NULL DEFAULT 0.00000000000000,
    `updated` int(11) unsigned NOT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_coords` (`center_lat`,`center_lon`),
    KEY `ix_updated` (`updated`)
);

CREATE TABLE IF NOT EXISTS `spawnpoint` (
    `id` bigint(15) unsigned NOT NULL,
    `lat` double(18,14) NOT NULL,
    `lon` double(18,14) NOT NULL,
    `updated` int(11) unsigned NOT NULL DEFAULT 0,
    `despawn_sec` smallint(6) unsigned DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_coords` (`lat`,`lon`),
    KEY `ix_updated` (`updated`)
);