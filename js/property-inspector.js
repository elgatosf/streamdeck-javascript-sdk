/// <reference path="constants.js" />
/// <reference path="api.js" />

class ELGSDPropertyInspector extends ELGSDApi {
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
}

const $SD = new ELGSDPropertyInspector();
