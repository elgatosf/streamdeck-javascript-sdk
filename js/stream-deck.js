/// <reference path="constants.js" />
/// <reference path="api.js" />

var $localizedStrings = $localizedStrings || {};

/**
 * @class StreamDeck
 * StreamDeck object containing all required code to establish
 * communication with SD-Software and the Property Inspector
 */
class ELGSDStreamDeck extends ELGSDApi {
	constructor() {
		super();
		if (ELGSDStreamDeck.__instance) {
			return ELGSDStreamDeck.__instance;
		}

		ELGSDStreamDeck.__instance = this;
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
	 * @param {number} [state]
	 */
	setState(context, state) {
		if (!context) {
			console.error('A context is required when using setState.');
		}

		this.send(context, Events.setState, {
			payload: {
				state: 1 - Number(state === 0),
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
	 * @param {string} action
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
	 * @param {string} [image]
	 * @param {number} [state]
	 * @param {number} [target]
	 */
	setImage(context, image, state, target = Constants.hardwareAndSoftware) {
		if (!context) {
			console.error('A key context is required for setImage.');
		}

		this.send(context, Events.setImage, {
			payload: {
				image,
				target,
				state,
			},
		});
	}

	// TODO: jsdoc, check if this can be used from the property inspector and move it to ELGSDApi
	setFeedback(context, payload) {
		if (!context) {
			console.error('A key context is required for setImage.');
		}

		this.send(context, Events.setFeedback, {
			payload,
		});
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
