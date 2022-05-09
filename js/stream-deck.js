/// <reference path="event-emitter.js" />
/// <reference path="constants.js" />

/**
 * @class StreamDeck
 * StreamDeck object containing all required code to establish
 * communication with SD-Software and the Property Inspector
 */
class ELGSDStreamDeck {
	port;
	uuid;
	messageType;
	actionInfo;
	websocket;
	language;
	localization;
	appInfo;
	on = EventEmitter.on;
	emit = EventEmitter.emit;

	constructor() {
		if (ELGSDStreamDeck.__instance) {
			return ELGSDStreamDeck.__instance;
		}

		ELGSDStreamDeck.__instance = this;
	}

	/**
	 * Connect to Stream Deck
	 * @param {string} port
	 * @param {string} uuid
	 * @param {string} messageType
	 * @param {string} appInfoString
	 * @param {string} actionString
	 */
	connect(port, uuid, messageType, appInfoString, actionString) {
		this.port = port;
		this.uuid = uuid;
		this.messageType = messageType;
		this.actionInfo = actionString ? JSON.parse(actionString) : null;
		this.appInfo = JSON.parse(appInfoString);
		this.language = this.appInfo?.application?.language ?? null;

		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}

		this.websocket = new WebSocket('ws://127.0.0.1:' + this.port);

		this.websocket.onopen = () => {
			const json = {
				event: this.messageType,
				uuid: this.uuid,
			};

			this.websocket.send(JSON.stringify(json));

			this.emit(Events.connected, {
				connection: this.websocket,
				port: this.port,
				uuid: this.uuid,
				actionInfo: this.actionInfo,
				appInfo: this.appInfo,
				messageType: this.messageType,
			});
		};

		this.websocket.onerror = (evt) => {
			const error = `WEBOCKET ERROR: ${evt}, ${evt.data}, ${SocketErrors[evt?.code]}`;
			console.warn(error);
			this.logMessage(error);
		};

		this.websocket.onclose = (evt) => {
			console.warn('WEBOCKET CLOSED:', SocketErrors[evt?.code]);
		};

		this.websocket.onmessage = (evt) => {
			const data = evt?.data ? JSON.parse(evt.data) : null;
			const { action, event } = data;
			const message = action ? `${action}.${event}` : event;
			if (message && message !== '') this.emit(message, data);
		};
	}

	/**
	 * Write to log file
	 * @param {string} message
	 */
	logMessage(message) {
		if (!message) {
			console.error('A message is required for logMessage.');
		}

		try {
			if (this.websocket) {
				const json = {
					event: Events.logMessage,
					payload: {
						message: message,
					},
				};
				this.websocket.send(JSON.stringify(json));
			} else {
				console.error('Websocket not defined');
			}
		} catch (e) {
			console.error('Websocket not defined');
		}
	}

	/**
	 * Fetches the specified language json file
	 * @param {string} pathPrefix
	 * @returns {Promise<void>}
	 */
	async loadLocalization(pathPrefix) {
		if (!pathPrefix) {
			console.error('A path to localization json is required for loadLocalization.');
		}

		const manifest = await this.readJson(`${pathPrefix}${this.language}.json`);
		this.localization = manifest['Localization'] ?? null;

		if (this.messageType === Events.registerPropertyInspector && this.localization) {
			const elements = document.querySelectorAll(Constants.dataLocalize);

			elements.forEach((element) => {
				element.textContent = this.localization[element.textContent] ?? element.textContent;
			});
		}
	}

	/**
	 *
	 * @param {string} path
	 * @returns {Promise<any>} json
	 */
	async readJson(path) {
		if (!path) {
			console.error('A path is required to readJson.');
		}

		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.onerror = reject;
			req.overrideMimeType('application/json');
			req.open('GET', path, true);
			req.onreadystatechange = (response) => {
				if (req.readyState === 4) {
					const jsonString = response?.target?.response;
					if (jsonString) {
						resolve(JSON.parse(response?.target?.response));
					} else {
						reject();
					}
				}
			};

			req.send();
		});
	}

	/**
	 * Send JSON payload to StreamDeck
	 * @param {string} context
	 * @param {string} event
	 * @param {object} [payload]
	 */
	send(context, event, payload = {}) {
		const pl = Object.assign({}, { context: context, event: event }, payload);
		this.websocket && this.websocket.send(JSON.stringify(pl));
	}

	/**
	 * Request the actions's persistent data. StreamDeck does not return the data, but trigger the actions's didReceiveSettings event
	 * @param {string} [context]
	 */
	getSettings(context) {
		this.send(context ?? this.uuid, Events.getSettings);
	}

	/**
	 * Save the actions's persistent data.
	 * @param context
	 * @param {object} payload
	 */
	setSettings(context, payload) {
		this.send(this.uuid, Events.setSettings, {
			action: this?.actionInfo?.action,
			payload: payload || null,
			targetContext: context,
		});
	}

	/**
	 * Request the plugin's persistent data. StreamDeck does not return the data, but trigger the plugin/property inspectors didReceiveGlobalSettings event
	 */
	getGlobalSettings() {
		this.send(this.uuid, Events.getGlobalSettings);
	}

	/**
	 * Save the plugin's persistent data
	 * @param {object} payload
	 */
	setGlobalSettings(payload) {
		this.send(this.uuid, Events.setGlobalSettings, {
			payload: payload,
		});
	}

	/**
	 * Opens a URL in the default web browser
	 * @param {string} url
	 */
	openUrl(url) {
		if (!url) {
			console.error('A url is required for openUrl.');
		}

		this.send(this.uuid, Events.openUrl, {
			payload: {
				url,
			},
		});
	}

	/**
	 * Send payload from the property inspector to the plugin
	 * @param {string} context
	 * @param {object} payload
	 */
	sendToPlugin(context, payload) {
		this.send(this.uuid, Events.sendToPlugin, {
			action: this?.actionInfo?.action,
			payload: payload || null,
			targetContext: context,
		});
	}

	/**
	 * Display alert triangle on actions key
	 * @param {string} context
	 */
	showAlert(context) {
		if (!context) {
			console.error('A context is required to showAlert on the key.');
		}

		this.send(context, Events.showAlert);
	}

	/**
	 * Display ok check mark on actions key
	 * @param {string} context
	 */
	showOk(context) {
		if (!context) {
			console.error('A context is required to showOk on the key.');
		}

		this.send(context, Events.showOk);
	}

	/**
	 * Set the state of the actions
	 * @param {string} context
	 * @param {object} payload
	 */
	setState(context, payload) {
		if (!payload) {
			console.error('A state is required when using setState.');
		}

		if (!context) {
			console.error('A context is required when using setState.');
		}

		this.send(context, Events.setState, {
			payload: {
				state: 1 - Number(payload === 0),
			},
		});
	}

	/**
	 * Set the title of the action's key
	 * @param {string} context
	 * @param {string} title
	 * @param [target]
	 */
	setTitle(context, title = '', target = Constants.hardwareAndSoftware) {
		if (!context) {
			console.error('A key context is required for setTitle.');
		}

		this.send(context, Events.setTitle, {
			payload: {
				title: title ? `${title}` : '',
				target,
			},
		});
	}

	/**
	 *
	 * @param {string} context
	 * @param {number} [target]
	 */
	clearTitle(context, target) {
		if (!context) {
			console.error('A key context is required to clearTitle.');
		}

		this.setTitle(context, null, target);
	}

	/**
	 * Send payload to property inspector
	 * @param {string} context
	 * @param {string} actionUUID
	 * @param {object} payload
	 */
	sendToPropertyInspector(context, action, payload = null) {
		if (typeof action != 'string') {
			console.error('An action UUID is required to sendToPropertyInspector.');
		}

		if (typeof context != 'string') {
			console.error('A key context is required to sendToPropertyInspector.');
		}

		this.send(context, Events.sendToPropertyInspector, {
			action,
			payload,
		});
	}

	/**
	 * Set the actions key image
	 * @param {string} context
	 * @param {string} image
	 * @param {number} [target]
	 */
	setImage(context, image = '', target = Constants.hardwareAndSoftware) {
		if (!image) {
			console.error('An image is required for setImage.');
		}

		if (!context) {
			console.error('A key context is required for setImage.');
		}

		this.send(context, Events.setImage, {
			payload: {
				image,
				target,
			},
		});
	}

	/**
	 * Switches to a readonly profile or returns to previous profile
	 * @param {string} device
	 * @param {string} [profile]
	 */
	switchToProfile(device, profile) {
		if (!device) {
			console.error('A device id is required for switchToProfile.');
		}

		if (!profile) {
			console.error('A profile name is required for switchToProfile');
		}

		this.send(this.uuid, Events.switchToProfile, { device: device, payload: { profile } });
	}

	/**
	 * Registers a callback function for when Stream Deck is connected
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onConnected(fn) {
		if (!fn) {
			console.error(
				'A callback function for the connected event is required for onConnected.'
			);
		}

		this.on(Events.connected, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for when Stream Deck sends data to the property inspector
	 * @param {string} actionUUID
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onSendToPropertyInspector(actionUUID, fn) {
		if (typeof actionUUID != 'string') {
			console.error('An action UUID string is required for onSendToPropertyInspector.');
		}

		if (!fn) {
			console.error(
				'A callback function for the sendToPropertyInspector event is required for onSendToPropertyInspector.'
			);
		}

		this.on(`${actionUUID}.${Events.sendToPropertyInspector}`, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the deviceDidConnect event, which fires when a device is plugged in
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onDeviceDidConnect(fn) {
		if (!fn) {
			console.error(
				'A callback function for the deviceDidConnect event is required for onDeviceDidConnect.'
			);
		}

		this.on(Events.deviceDidConnect, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the deviceDidDisconnect event, which fires when a device is unplugged
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onDeviceDidDisconnect(fn) {
		if (!fn) {
			console.error(
				'A callback function for the deviceDidDisconnect event is required for onDeviceDidDisconnect.'
			);
		}

		this.on(Events.deviceDidDisconnect, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the applicationDidLaunch event, which fires when the application starts
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onApplicationDidLaunch(fn) {
		if (!fn) {
			console.error(
				'A callback function for the applicationDidLaunch event is required for onApplicationDidLaunch.'
			);
		}

		this.on(Events.applicationDidLaunch, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the applicationDidTerminate event, which fires when the application exits
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onApplicationDidTerminate(fn) {
		if (!fn) {
			console.error(
				'A callback function for the applicationDidTerminate event is required for onApplicationDidTerminate.'
			);
		}

		this.on(Events.applicationDidTerminate, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the systemDidWakeUp event, which fires when the computer wakes
	 * @param {function} fn
	 * @returns ELGSDStreamDeck
	 */
	onSystemDidWakeUp(fn) {
		if (!fn) {
			console.error(
				'A callback function for the systemDidWakeUp event is required for onSystemDidWakeUp.'
			);
		}

		this.on(Events.systemDidWakeUp, (jsn) => fn(jsn));
		return this;
	}

	/**
	 * Registers a callback function for the didReceiveGlobalSettings event, which fires when calling getGlobalSettings
	 * @param {function} fn
	 */
	onDidReceiveGlobalSettings(fn) {
		if (!fn) {
			console.error(
				'A callback function for the didReceiveGlobalSettings event is required for onDidReceiveGlobalSettings.'
			);
		}

		this.on(Events.didReceiveGlobalSettings, (jsn) => fn(jsn));
		return this;
	}
}

const $SD = new ELGSDStreamDeck();

/**
 * connectElgatoStreamDeckSocket
 * This is the first function StreamDeck Software calls, when
 * establishing the connection to the plugin or the Property Inspector
 * @param {string} port - The socket's port to communicate with StreamDeck software.
 * @param {string} uuid - A unique identifier, which StreamDeck uses to communicate with the plugin
 * @param {string} messageType - Identifies, if the event is meant for the property inspector or the plugin.
 * @param {string} appInfoString - Information about the host (StreamDeck) application
 * @param {string} actionInfo - Context is an internal identifier used to communicate to the host application.
 */
function connectElgatoStreamDeckSocket(port, uuid, messageType, appInfoString, actionInfo) {
	$SD.connect(port, uuid, messageType, appInfoString, actionInfo);
}
