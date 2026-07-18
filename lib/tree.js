//
// tree.js
// @trenskow/print
//
// Created by Kristian Trenskow on 2026/07/18
// See license in LICENSE.
//

export default (print) => {

	return (data, { paddingLeft = 0, spacing = 2 } = {}) => {

		const boxDrawing = {
			vertical: '│',
			horizontal: '─',
			tee: '├',
			elbow: '└',
			branch: '┐',
		};

		const printLevel = (level) => {

			print.nn(' '.repeat(paddingLeft));

			level.forEach((hasNext) => {
				print.nn(`${hasNext ? boxDrawing.vertical : ' '}${' '.repeat(spacing)}`);
			});

		};

		const printObjectNode = (object, level = []) => {

			const keys = Object.keys(object);

			keys.forEach((key, idx) => {

				printLevel(level);

				const isLast = idx === keys.length - 1;

				print.nn(`${isLast ? boxDrawing.elbow : boxDrawing.tee}`);

				print.nn(`${boxDrawing.horizontal.repeat(spacing)}`);

				if (typeof object[key] === 'object' && object[key] !== null) {
					print.nn(`${boxDrawing.branch}`);
				} else {
					print.nn(`${boxDrawing.horizontal}`);
				}

				print.nn(` ${key}:`);

				if (typeof object[key] === 'object' && object[key] !== null) {
					print();
					return printObjectNode(object[key], level.concat(isLast ? false : true));
				}

				print.nn(' ');

				printNode(object[key], level);

			});

		};

		const printNode = (node, level = []) => {

			if (typeof node === 'object' && node !== null) {
				return printObjectNode(node, level);
			}

			print(`${node}`);

		};

		printNode(data);

	};

};
