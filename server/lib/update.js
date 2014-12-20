"use strict";

var npm,
    async   = require("async"),
    chalk   = require("chalk"),
    pidFile = require("./paths.js").get().pid;

function updateSelf(pkg, callback) {
    function loadNPM(cb) {
        // obtain a reference to the global npm to avoid having to install npm locally
        require("child_process").exec("npm", function (err, stdout) {
            var match = /npm@[^ ]+ (.+)\n/i.exec(stdout);
            if (!match) return cb(new Error("Unable to find path in npm help message."));
            cb(null, require(match[1]));
        });
    }

    function getNPMVersion(cb) {
        npm.commands.view([pkg.name, "dist-tags.latest"], true, function (err, response) {
            if (err) return cb(err);
            cb(null, Object.keys(response)[0]);
        });
    }

    function getInstalledVersion(cb) {
        npm.commands.list([pkg.name], true, function (err, response) {
            if (err) return cb(err);
            cb(null, response.dependencies[pkg.name].version);
        });
    }

    function install(versions, cb) {
        console.info("Updating " + pkg.name + " from " + chalk.green(versions[0]) + " to " + chalk.green(versions[1]) + " ...");
        npm.commands.install([pkg.name + "@" + versions[1]], function (err)  {
            if (err) return cb(err);
            cb(null, "Successfully updated to " + chalk.green(versions[1]) + "!");
        });
    }

    function update() {
        console.info("Getting latest version from npm ...");
        async.parallel([getInstalledVersion, getNPMVersion], function (err, versions) {
            if (err) return callback(err);
            if (versions[0] !== versions[1]) {
                fs.readFile(pidFile, function(err, data) {
                    if (!err) {
                        var pid = parseInt(String(data), 10);
                        if (typeof pid === "number") {
                            try {
                                console.info("Shutting down active process ...");
                                process.kill(pid, "SIGTERM");
                                setTimeout(function () {
                                    install(versions, callback);
                                }, 5000);
                            } catch (e) {
                                install(versions, callback);
                            }
                        }
                    } else {
                        install(versions, callback);
                    }
                });
            } else {
                callback(null, pkg.name + " is already up to date!");
            }
        });
    }

    if (!npm) {
        loadNPM(function (err, npmObj) {
            if (err) return callback(err);
            npmObj.load({global: true, loglevel: "silent"}, function (err, npmObj) {
                if (err) return callback(err);
                npm = npmObj;
                update();
            });
        });
    } else {
        update();
    }
}

exports = module.exports = updateSelf;
