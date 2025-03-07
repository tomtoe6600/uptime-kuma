const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { DOWN, UP } = require("../../src/util");

class Teams extends NotificationProvider {
    name = "teams";

    /**
     * Generate the message to send
     * @param {const} status The status constant
     * @param {string} monitorName Name of monitor
     * @returns {string}
     */
    _statusMessageFactory = (status, monitorName) => {
        if (status === DOWN) {
            return `🔴 Application [${monitorName}] went down`;
        } else if (status === UP) {
            return `✅ Application [${monitorName}] is back online`;
        }
        return "Notification";
    };

    /**
     * Select theme color to use based on status
     * @param {const} status The status constant
     * @returns {string} Selected color in hex RGB format
     */
    _getThemeColor = (status) => {
        if (status === DOWN) {
            return "ff0000";
        }
        if (status === UP) {
            return "00e804";
        }
        return "008cff";
    };

    /**
     * Generate payload for notification
     * @param {const} status The status of the monitor
     * @param {string} monitorMessage Message to send
     * @param {string} monitorName Name of monitor affected
     * @param {string} monitorUrl URL of monitor affected
     * @returns {Object}
     */
    _notificationPayloadFactory = ({
        status,
        monitorMessage,
        monitorName,
        monitorUrl,
    }) => {
        const notificationMessage = this._statusMessageFactory(
            status,
            monitorName
        );

        const facts = [];

        if (monitorName) {
            facts.push({
                name: "Monitor",
                value: monitorName,
            });
        }

        if (monitorUrl && monitorUrl !== "https://") {
            facts.push({
                name: "URL",
                value: monitorUrl,
            });
        }

        return {
            "@context": "https://schema.org/extensions",
            "@type": "MessageCard",
            themeColor: this._getThemeColor(status),
            summary: notificationMessage,
            sections: [
                {
                    activityImage:
                        "https://raw.githubusercontent.com/tomtoe6600/uptime-kuma/master/public/icon.png",
                    activityTitle: "**NeoUptime**",
                },
                {
                    activityTitle: notificationMessage,
                },
                {
                    activityTitle: "**Description**",
                    text: monitorMessage,
                    facts,
                },
            ],
        };
    };

    /**
     * Send the notification
     * @param {string} webhookUrl URL to send the request to
     * @param {Object} payload Payload generated by _notificationPayloadFactory
     */
    _sendNotification = async (webhookUrl, payload) => {
        await axios.post(webhookUrl, payload);
    };

    /**
     * Send a general notification
     * @param {string} webhookUrl URL to send request to
     * @param {string} msg Message to send
     * @returns {Promise<void>}
     */
    _handleGeneralNotification = (webhookUrl, msg) => {
        const payload = this._notificationPayloadFactory({
            monitorMessage: msg
        });

        return this._sendNotification(webhookUrl, payload);
    };

    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        let okMsg = "Sent Successfully.";

        try {
            if (heartbeatJSON == null) {
                await this._handleGeneralNotification(notification.webhookUrl, msg);
                return okMsg;
            }

            let url;

            switch (monitorJSON["type"]) {
                case "http":
                case "keywork":
                    url = monitorJSON["url"];
                    break;
                case "docker":
                    url = monitorJSON["docker_host"];
                    break;
                default:
                    url = monitorJSON["hostname"];
                    break;
            }

            const payload = this._notificationPayloadFactory({
                monitorMessage: heartbeatJSON.msg,
                monitorName: monitorJSON.name,
                monitorUrl: url,
                status: heartbeatJSON.status,
            });

            await this._sendNotification(notification.webhookUrl, payload);
            return okMsg;
        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }
}

module.exports = Teams;
