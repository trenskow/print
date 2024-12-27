//
// index.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2022/03/13
// See license in LICENSE.
//

import NullStream from '@trenskow/null-stream';
import keyd from 'keyd';

let ttyColumn = 0;

const printer = (stream) => {

	const print = (content = '', options = {}) => {

		if (!Array.isArray(content)) content = [content];

		content.forEach((line) => {

			let output = line;

			if (typeof options.minimumLength === 'number' && options.minimumLength > line.length) {
				output += (new Array(options.minimumLength - line.length)).fill(' ').join('');
			}

			if (options.newLine !== false) output += '\n';

			stream.write(output);

			if (stream.isTTY) {

				const lines = output.split('\n');

				if (lines.length > 1) ttyColumn = 0;

				ttyColumn = (ttyColumn + lines[lines.length - 1].length) % stream.columns;

			}

		});

	};

	print.nn = (content, options = {}) => {
		print(content, Object.assign({ newLine: false }, options));
	};

	print.sentence = (sentence) => {

		if (!stream.isTTY) return print(sentence);

		const offset = ttyColumn;

		const words = sentence.split(' ');

		words
			.forEach((word) => {

				if (ttyColumn + word.length >= stream.columns) {
					print();
					print.nn((new Array(offset).fill(' ').join('')));
				}

				if (ttyColumn !== offset) print.nn(' ');

				print.nn(word);

			});

		print();

	};

	print.table = ({ columns, data, options: { header } = { header: true } }) => {

		if (!Array.isArray(data)) data = [data];

		data = data.map((row) => Object.keys(columns).map((column) => `${keyd(row).get(column) || ''}`));

		if (!stream.isTTY) {
			print(data.map((row) => row.join('\t')).join('\n'));
			return;
		}

		data = [header ? Object.values(columns) : [], ...data];

		const columnWidth = Object.keys(columns)
			.map((_, idx) => {
				return Math.max(...data.map((row) => row[idx].length));
			});

		data.forEach((row, idx) => {
			print.nn(idx === 0 && header ? '\x1b[1m' : '\x1b[0m');
			print(row.map((cell, idx) => cell.padEnd(columnWidth[idx])).join('  '));
		});

	};

	Object.defineProperty(print, 'tty', {
		get: () => {
			return stream.isTTY ? print : printer(new NullStream());
		}
	});

	return print;

};

const print = printer(process.stdout);

print.out = print;
print.err = printer(process.stderr);
print.stream = printer;

const parallelProgress = (options = {}) => {

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

print.parallelProgress = parallelProgress;

export default print;
export { parallelProgress };
