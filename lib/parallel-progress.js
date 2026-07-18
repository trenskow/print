//
// parallel-progress.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2026/07/18
// See license in LICENSE.
//

export default (options = {}) => {

	options.simpleOutput = !process.stdout.isTTY || options.simpleOutput;

	const {
		states,
		simpleOutput = false,
		completionState = 'done',
		waitingState = 'waiting'
	} = options;

	if (typeof states === 'undefined') throw new Error('`states` option must be supplied.');

	if (typeof states !== 'object' || states === null || Array.isArray(states)) {
		throw new Error('`states` option must be an object.');
	}

	const maxLength = Object.keys(states).reduce((result, current) => Math.max(result, current.length), 0);

	const nonDoneNames = () => {
		return Object.keys(states)
			.filter((name) => states[name].state !== completionState)
			.sort();
	};

	const print = () => {
		if (simpleOutput) return;
		nonDoneNames().forEach((name) => {
			process.stdout.write(`\x1b[m${name.padEnd(maxLength + 3)}`);
			if (states[name].state !== waitingState) {
				process.stdout.write('\x1b[1m');
			}
			process.stdout.write(`${states[name].state}\n`);
		});
	};

	const clear = (additional = 0) => {
		if (simpleOutput) return;
		[...nonDoneNames(), ...Array(additional).fill()]
			.forEach(() => process.stdout.write('\x1b[1A\x1b[K'));
	};

	print();

	return {
		stateUpdated: (name) => {

			if (simpleOutput) {
				return console.info(`${name.padEnd(maxLength)} ${states[name].state}`);
			}

			clear(states[name].state === completionState ? 1 : 0);
			print();

		}
	};

};
