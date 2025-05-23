//
// index.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2022/03/13
// See license in LICENSE.
//

import { PassThrough } from 'stream';

import NullStream from '@trenskow/null-stream';
import keyd from 'keyd';

let ttyColumn = 0;
let forceTTY = ['1', 'true'].includes(process.env.FORCE_TTY);
let ttyWidth = parseInt(process.env.TTY_WIDTH) || process.stdout.columns || 80;

const printer = (stream) => {

	const isTTY = forceTTY || stream.isTTY;

	const print = (content = '', options = {}) => {

		if (!Array.isArray(content)) content = [content];

		content.forEach((line) => {

			let output = line;

			if (typeof options.minimumLength === 'number' && options.minimumLength > line.length) {
				output += (new Array(options.minimumLength - line.length)).fill(' ').join('');
			}

			if (options.newLine !== false) output += '\n';

			stream.write(output);

			if (isTTY) {

				const lines = output.split('\n');

				if (lines.length > 1) ttyColumn = 0;

				ttyColumn = (ttyColumn + lines[lines.length - 1].length) % (stream.columns || ttyWidth);

			}

		});

	};

	print.nn = (content, options = {}) => {
		print(content, Object.assign({ newLine: false }, options));
	};

	Object.entries({
		1: [['bold', 'bright'], ['dim', 'dimmed'], undefined, ['underscore', 'underline', 'underlined'], 'blink', ['reverse', 'reversed'], ['hidden', 'invisible']],
		30: ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
	}).forEach(([offset, modifiers]) => {

		offset = parseInt(offset);

		modifiers.forEach((modifier, idx) => {

			if (typeof modifier === 'undefined') return;

			if (!Array.isArray(modifier)) modifier = [modifier];

			modifier.forEach((modifier) => {

				print[modifier] = (content) => {
					print[modifier].nn(content);
					print();
				};

				print[modifier].nn = (content) => {
					if (isTTY) print.nn(`\x1b[${offset + idx}m`);
					print.nn(content);
					if (isTTY) print.nn('\x1b[0m');
				};

			});


		});

	});

	print.color = (colors) => {
		return (content) => {
			print.color.nn(colors)(content);
			print();
		};
	};

	print.color.nn = (colors) => {

		if (!Array.isArray(colors)) colors = [colors];

		while (colors.length < 3) colors.push(0);

		if (colors.some((color) => color > 1)) {
			colors = colors.map((color) => color / 255);
		}

		if (process.env.COLORTERM !== 'truecolor') {
			return print;
		}

		return (content) => {

			if (isTTY) {
				print.nn(`\x1b[38;2;${colors.map((color) => Math.round(color * 255)).join(';')}m`);
			}

			print(content);

			if (isTTY) {
				print.nn('\x1b[0m');
			}

		};

	};

	print.sentence = (sentence) => {

		if (!isTTY) return print(sentence);

		const offset = ttyColumn;

		const words = sentence.split(' ');

		words
			.forEach((word) => {

				if (ttyColumn + word.length >= (stream.columns || ttyWidth)) {
					print();
					print.nn((new Array(offset).fill(' ').join('')));
				}

				if (ttyColumn !== offset) print.nn(' ');

				print.nn(word);

			});

		print();

	};

	print.table = ({ columns, data, options: { paddingLeft = 0 } = {} }) => {

		if (!Array.isArray(data)) data = [data];

		let header = true;

		if (Array.isArray(columns)) {

			header = false;

			columns = Object.fromEntries(
				columns.map((column) => [column, column]));

		}

		data = data.map((row) => Object.keys(columns)
			.map((column) => keyd(row).get(column) || '')
			.map((column) => typeof column === 'function' ? column() : column)
			.map((column) => `${''.padStart(paddingLeft, ' ')}${column || ''}`));

		if (!isTTY) {
			print(data.map((row) => row.join('\t')).join('\n'));
			return;
		}

		if (header) {
			data = [Object.values(columns), ...data];
		}

		const columnWidth = Object.keys(columns)
			.map((_, idx) => {
				return Math.max(...data.map((row) => row[idx].length));
			});

		data.forEach((row, idx) => {

			print.tty.nn(idx === 0 && header ? `${''.padStart(paddingLeft, ' ')}\x1b[2m` : '\x1b[0m');

			print(
				row
					.map((cell) => typeof cell === 'function' ? cell() : cell)
					.map((cell, idx) => cell.padEnd(columnWidth[idx])).join('  '));

		});

	};

	Object.defineProperty(print, 'tty', {
		get: () => {
			return isTTY ? printer(stream) : printer(new NullStream());
		}
	});

	return print;

};

const print = printer(process.stdout);

print.out = print;
print.err = printer(process.stderr);
print.stream = printer;

print.toString = (writer) => {

	const stream = new PassThrough();

	let string = '';

	stream.on('data', (chunk) => string += chunk.toString());

	writer(printer(stream));

	stream.end();

	return string;

};

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
