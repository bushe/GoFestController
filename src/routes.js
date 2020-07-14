'use strict';

const express = require('express');
const router = express.Router();
const POGOProtos = require('pogo-protos');
//const POGOProtos = require('../POGOProtos.Rpc_pb.js');

const config = require('./config.json');
const Account = require('./models/account.js');
const Device = require('./models/device.js');
const TaskFactory = require('./services/task-factory.js');
const { getCurrentTimestamp, base64_decode, sendResponse } = require('./utilities/utils.js');

const taskFactory = new TaskFactory();
const levelCache = {};


/**
 * Handle incoming device /controler data
 * @param {*} req 
 * @param {*} res 
 */
const handleControllerData = async (req, res) => {
    console.log("[Controller] Request payload:", req.body);
    let payload = req.body;
    let type = payload["type"];
    let uuid = payload["uuid"];
    if (type === undefined || type === null ||
        uuid === undefined || uuid === null) {
        console.error("[Controller] Failed to parse controller data");
        return res.sendStatus(400);
    }
    //let username = payload["username"];
    let minLevel = parseInt(payload["min_level"] || 0);
    let maxLevel = parseInt(payload["max_level"] || 29);
    let device = await Device.getById(uuid);

    console.log("[Controller]", uuid, "received control request:", type);

    switch (type) {
        case "init":
            let firstWarningTimestamp;
            if (device === undefined || device.accountUsername === undefined) {
                firstWarningTimestamp = null;
            } else {
                let account = await Account.getWithUsername(device.accountUsername);
                if (account instanceof Account) {
                    firstWarningTimestamp = account.firstWarningTimestamp;
                } else {
                    firstWarningTimestamp = null;
                }
            }
            if (device instanceof Device) {
                // Device is already registered
                console.log("[Controller] Device already registered");
                sendResponse(res, 'ok', {
                    assigned: device.instanceName !== undefined && device.instanceName !== null && device.instanceName !== "",
                    first_warning_timestamp: firstWarningTimestamp || 0
                });
            } else {
                // Register new device
                console.log("[Controller] Registering device");
                let newDevice = new Device(uuid, null, null, 0, null, 0, 0.0, 0.0, null);
                await newDevice.create();
                sendResponse(res, 'ok', {
                    assigned: false,
                    first_warning_timestamp: firstWarningTimestamp
                });
            }
            break;
        case "heartbeat":
            let client = req.socket;
            let host = client 
                ? `${client.remoteAddress}:${client.remotePort}` 
                : "?";
            try {
                await Device.touch(uuid, host, false);
                sendResponse(res, 'ok', null);
            } catch (err) {
                res.send(err);
            }
            break;
        case "get_job":
            console.log("[Controller] Get job for uuid", uuid);
            let task = taskFactory.getTask();
            if (task) {
                console.log("[Controller] Sending job to check 100% IV at", task.lat, task.lon, "for uuid", uuid);
                sendResponse(res, 'ok', task);
            } else {
                console.warn("[Controller] No tasks available yet for uuid", uuid);
            }
            break;
        case "get_account":
            let account = await Account.getNewAccount(minLevel, maxLevel, true);
            console.log("[Controller] GetAccount:", account);
            if (device === undefined || device === null || 
                account === undefined || account === null) {
                console.error("[Controller] Failed to get event account, device or account is null.");
                return res.sendStatus(400);
            }
            if (device.accountUsername) {
                let oldAccount = await Account.getWithUsername(device.accountUsername, true);
                if (oldAccount instanceof Account && 
                    oldAccount.level >= minLevel &&
                    oldAccount.level <= maxLevel &&
                    oldAccount.firstWarningTimestamp === undefined && 
                    oldAccount.failed                === undefined && 
                    oldAccount.failedTimestamp       === undefined) {
                    sendResponse(res, 'ok', {
                        username: oldAccount.username.trim(),
                        password: oldAccount.password.trim(),
                        first_warning_timestamp: oldAccount.firstWarningTimestamp,
                        level: oldAccount.level
                    });
                    return;
                }
            }

            device.accountUsername = account.username;
            device.deviceLevel = account.level;
            await device.save(device.uuid);
            sendResponse(res, 'ok', {
                username: account.username.trim(),
                password: account.password.trim(),
                first_warning_timestamp: account.firstWarningTimestamp,
                level: account.level
            });
            break;
        case "account_banned":
            let banAccount = await Account.getWithUsername(device.accountUsername);
            if (banAccount instanceof Account) {
                if (banAccount.failedTimestamp === undefined || banAccount.failedTimestamp === null || 
                    banAccount.failed === undefined || banAccount.failed === null) {
                        banAccount.failedTimestamp = getCurrentTimestamp();
                        banAccount.failed = "banned";
                        await banAccount.save(true);
                        sendResponse(res, 'ok', null);
                }
            } else {
                if (device === undefined || device === null ||
                    banAccount === undefined || banAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "account_warning":
            let warnAccount = await Account.getWithUsername(device.accountUsername);
            if (warnAccount instanceof Account) {
                if (warnAccount.firstWarningTimestamp === undefined || warnAccount.firstWarningTimestamp === null) {
                    warnAccount.firstWarningTimestamp = getCurrentTimestamp();
                    await warnAccount.save(true);
                    sendResponse(res, 'ok', null);
                }
            } else {
                if (device === undefined || device === null ||
                    warnAccount === undefined || warnAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "account_invalid_credentials":
            let invalidAccount = await Account.getWithUsername(device.accountUsername);
            if (invalidAccount instanceof Account) {
                if (invalidAccount.failedTimestamp === undefined || invalidAccount.failedTimestamp === null || 
                    invalidAccount.failed === undefined || invalidAccount.failed === null) {
                        invalidAccount.failedTimestamp = getCurrentTimestamp();
                        invalidAccount.failed = "invalid_credentials";
                        await invalidAccount.save(true);
                        sendResponse(res, 'ok', null);
                }
            } else {
                if (device === undefined || device === null ||
                    invalidAccount === undefined || invalidAccount === null) {
                    console.error("[Controller] Failed to get account, device or account is null.");
                    return res.sendStatus(400);
                }
            }
            break;
        case "logged_out":
            try {
                let device = await Device.getById(uuid);
                if (device instanceof Device) {
                    if (device.accountUsername === null) {
                        return res.sendStatus(404);
                    }
                    await Account.setInstanceUuid(device.uuid, device.instanceName, device.accountUsername);
                    device.accountUsername = null;
                    await device.save(device.uuid);
                    sendResponse(res, 'ok', null);
                } else {
                    return res.sendStatus(404);
                }
            } catch {
                return res.sendStatus(500);
            }
            break;
        case "job_failed":
            sendResponse(res, 'ok', null);
            break;
        default:
            console.error("[Controller] Unhandled Request:", type);
            return res.sendStatus(404);
    }
};


/**
 * Handle incoming /raw data
 * @param {*} req 
 * @param {*} res 
 */
const handleRawData = async (req, res) => {
    let json = req.body;
    if (json === undefined || json === null) {
        console.error("[Raw] Bad data");
        return res.sendStatus(400);
    }
    if (json['payload']) {
        json['contents'] = [json];
    }

    let trainerLevel = parseInt(json["trainerlvl"] || json["trainerLevel"]) || 0;
    let username = json["username"];
    if (username && trainerLevel > 0) {
        let oldLevel = levelCache[username];
        if (oldLevel !== trainerLevel) {
            await Account.setLevel(username, trainerLevel);
            levelCache[username] = trainerLevel;
        }
    }
    let contents = json["contents"] || json["protos"] || json["gmo"];
    if (contents === undefined || contents === null) {
        console.error("[Raw] Invalid GMO");
        return res.sendStatus(400);
    }
    let uuid = json["uuid"];
    let latTarget = json["lat_target"];
    let lonTarget = json["lon_target"];
    if (uuid && latTarget && lonTarget) {
        try {
            //console.log("[Raw] Setting", uuid, "last device location to", latTarget, lonTarget);
            await Device.setLastLocation(uuid, latTarget, lonTarget);
        } catch (err) {
            console.error("[Raw] Error:", err);
        }
    }

    //let pokemonEncounterId = json["pokemon_encounter_id"];
    //let pokemonEncounterIdForEncounter = json["pokemon_encounter_id_for_encounter"];

    let wildPokemon = [];
    let nearbyPokemon = [];
    let encounters = [];

    let isEmptyGMO = true;
    let isInvalidGMO = true;
    let containsGMO = false;
    let isMadData = false;

    for (let i = 0; i < contents.length; i++) {
        const rawData = contents[i];
        let data = {};
        let method = 0;
        if (rawData["data"]) {
            data = rawData["data"];
            method = parseInt(rawData["method"]) || 106;
        } else if (rawData["payload"]) {
            data = rawData["payload"];
            method = parseInt(rawData["type"]) || 106;
            isMadData = true;
            username = "PogoDroid";
        } else {
            console.error("[Raw] Unhandled proto:", rawData);
            return res.sendStatus(400);
        }

        switch (method) {
            case 2: // GetPlayerResponse
            case 4: // GetHoloInventoryResponse
            case 101: // FortSearchResponse
            case 104: // FortDetailsResponse
            case 156: // GymGetInfoResponse
                break;
            case 102: // EncounterResponse
                if (trainerLevel >= 30 || isMadData !== false) {
                    try {
                        let er = POGOProtos.Networking.Responses.EncounterResponse.decode(base64_decode(data));
                        if (er) {
                            encounters.push(er);
                        } else {
                            console.error("[Raw] Malformed EncounterResponse");
                        }
                    } catch (err) {
                        console.error("[Raw] Unable to decode EncounterResponse");
                    }
                }
                break;
            case 106: // GetMapObjectsResponse
                containsGMO = true;
                try {
                    let gmo = POGOProtos.Networking.Responses.GetMapObjectsResponse.decode(base64_decode(data));
                    if (gmo) {
                        isInvalidGMO = false;
                        if (gmo.map_cells.length === 0) {
                            //console.debug("[Raw] Map cells is empty");
                            return res.sendStatus(400);
                        }
                        gmo.map_cells.forEach((mapCell) => {
                            let timestampMs = mapCell.current_timestamp_ms;
                            let wildNew = mapCell.wild_pokemons;
                            wildNew.forEach((wild) => {
                                wildPokemon.push({
                                    cell: mapCell.s2_cell_id,
                                    data: wild,
                                    timestampMs: timestampMs
                                });
                            });
                            let nearbyNew = mapCell.nearby_pokemons;
                            nearbyNew.forEach((nearby) => {
                                nearbyPokemon.push({
                                    cell: mapCell.s2_cell_id,
                                    data: nearby
                                });
                            });
                        });
                    } else {
                        console.error("[Raw] Malformed GetMapObjectsResponse");
                    }
                } catch (err) {
                    console.error("[Raw] Unable to decode GetMapObjectsResponse:", err);
                }
                break;
            default:
                console.error("[Raw] Invalid method provided:", method);
                return;
        }
    }

    if (wildPokemon.length > 0 || nearbyPokemon.length > 0 || encounters.length > 0) {
        console.log("[Raw] Found:", wildPokemon.length, "wild and", nearbyPokemon.length, "nearby Pokemon and", encounters.length, "encounters at", latTarget, lonTarget);
    }

    if (wildPokemon.length > 0) {
        for (let i = 0; i < wildPokemon.length; i++) {
            const wild = wildPokemon[i];
            //console.log("Wild Pokemon Found", wild.data.pokemon_data.pokemon_id);
            //console.log("Wild data:", wild.data.pokemon_data);
        }
    }
    if (nearbyPokemon.length > 0) {
        for (let i = 0; i < nearbyPokemon.length; i++) {
            const nearby = nearbyPokemon[i];
            //console.log("Nearby Pokemon Found", nearby.data.pokemon_id);
        }
    }
    if (encounters.length > 0) {
        console.log("[Raw] Encounters:", encounters);
    }

    // TODO: Do something with relevant spawns
    sendResponse(res, 'ok', null);
};


/**
 * Handle incoming webhook data
 * @param {*} req 
 * @param {*} res 
 */
const handleWebhookData = async (req, res) => {
    let payload = req.body;
    if (payload.length > 0) {
        let filtered = payload.filter(x =>
            x.type === 'pokemon' &&
            matchesIVFilter(x.message.individual_attack, x.message.individual_defense, x.message.individual_stamina)
        );
        if (filtered.length > 0) {
            console.log("[Webhook] Filtered Pokemon Received:", filtered.length);
            for (let i = 0; i < filtered.length; i++) {
                taskFactory.enqueue(filtered[i]);
            }
        }
    }
    res.send('OK');
};


/**
 * Handle tasks/jobs data
 * @param {*} req 
 * @param {*} res 
 */
const handleTasksData = async (req, res) => {
    res.json({ tasks: taskFactory.getAll() });
};


const matchesIVFilter = (atk, def, sta) => {
    let filters = config.filters;
    let result = false;
    for (let i = 0; i < filters.length; i++) {
        let filter = filters[i];
        if (filter.atk === atk && filter.def === def && filter.sta === sta) {
            result = true;
            break;
        }
    }
    return result;
}


router.get(['/controler', '/controller'], handleControllerData);
router.post(['/controler', '/controller'], handleControllerData);

router.get('/raw', handleRawData);
router.post('/raw', handleRawData);

router.get('/', handleWebhookData);
router.post('/', handleWebhookData);

router.get('/tasks', handleTasksData);

module.exports = router;