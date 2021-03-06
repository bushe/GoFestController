# GoFestController  

Backend to facilitate re-checking a Pokemon spawn with an event ticket account.  


## Prerequisites  
- [NodeJS v12.0](https://nodejs.org/en/download/)  
- [RealDeviceMap](https://github.com/realdevicemap/realdevicemap) installation  
- New database for GoFestController (i.e. gfc, gfcdb, etc..)  
- Run the `schema.sql` migration file against your new GoFestController database  


## Installation  
1.) Clone respository: `git clone https://github.com/versx/GoFestController --recursive`  
2.) Change directory to cloned folder: `cd GoFestController`  
3.) Install dependencies: `npm install`  
4.) Create config from example: `cp src/config.example.json src/config.json`  
5.) Edit/fill out config: `vi src/config.json`  
6.) Start `npm run start`  
7.) Add GoFestController endpoint to RDM webhook urls i.e. `http://gfcip:5150`  


## Importing Accounts  
1.) Create `.csv` file with event accounts to import i.e. `accounts.csv` (Format: `username,password`)  
2.) Start account importer `npm run import -- /path/to/accounts.csv`  


## Notes  
If you'd like to use the same/one database for everything, change the database sections in the config.json to match the same info.  


## Configuration  
```js
{
    // Host interface to listen on
    "interface": "0.0.0.0",
    // Listening port for backend
    "port": 5150,
    // Minimum account level to use
    "minLevel": 30,
    // Maximum account level to use
    "maxLevel": 40,
    // Instance name
    "instanceName": "GoFest-Test",
    // Custom IV filter list to re-check Pokemon against
    "filters": [
        { "atk": 15, "def": 15, "sta": 15 },
        { "atk": 0, "def": 15, "sta": 15 },
        { "atk": 0, "def": 15, "sta": 14 },
        { "atk": 0, "def": 14, "sta": 15 },
        { "atk": 0, "def": 14, "sta": 14 },
        { "atk": 1, "def": 15, "sta": 15 },
        { "atk": 1, "def": 15, "sta": 14 },
        { "atk": 1, "def": 14, "sta": 15 },
        { "atk": 1, "def": 14, "sta": 14 },
        { "atk": 0, "def": 0,  "sta": 0 }
    ],
    // Geofences to restrict re-checking incoming RDM webhooks, specify Geofence names to only check data for that area or leave empty i.e `[]` for no area restriction
    "geofences": [],
    // RealDeviceMap database
    "db": {
        // RealDeviceMap database information
        "rdm": {
            // Database IP address/FQDN
            "host": "127.0.0.1",
            // Database listening port
            "port": 3306,
            // Database account username
            "username": "user123",
            // Database account password
            "password": "pass123",
            // Database name
            "database": "rdmdb",
            // Database character set
            "charset": "utf8mb4"
        },
        // GoFestController database information
        "gfc": {
            // Database IP address/FQDN
            "host": "127.0.0.1",
            // Database listening port
            "port": 3306,
            // Database account username
            "username": "user123",
            // Database account password
            "password": "pass123",
            // Database name
            "database": "gfcdb",
            // Database character set
            "charset": "utf8mb4"
        }
    },
    // Relay webhook
    "webhooks": {
        // Set to true to enable webhook relays for rechecked Pokemon
        "enabled": false,
        // Webhook endpoint to send payload to
        "urls": [],
        // Delay before sending next webhook payload
        "delay": 5
    }
}
```


## Available Endpoints  
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Incoming RDM webhooks endpoint |
| GET \| POST | `/raw` | Incoming GFC raw data endpoint |
| GET \| POST | `/controler` | Support for typflo controller endpoint to control devices |
| GET \| POST | `/controller` | Support for controller endpoint to control devices |
| GET | `/tasks` | Table of queued tasks |
| POST | `/test` | Test endpoint for GFC webhook relay |
