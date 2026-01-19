const Table = ({ children, node, ...props }: any) => {
	return (
		<div className="my-6 overflow-x-auto w-full">
			<table
				className="min-w-full border-collapse border border-gray-200 bg-white text-sm"
				{...props}
			>
				{children}
			</table>
		</div>
	);
};

const TableHead = ({ children, node, ...props }: any) => {
	return (
		<thead className="bg-gray-50" {...props}>
			{children}
		</thead>
	);
};

const TableBody = ({ children, ...props }: any) => {
	return (
		<tbody className="divide-y divide-gray-200" {...props}>
			{children}
		</tbody>
	);
};

const TableRow = ({ children, node, ...props }: any) => {
	return (
		<tr className="hover:bg-gray-50 transition-colors" {...props}>
			{children}
		</tr>
	);
};

const TableHeader = ({ children, ...props }: any) => {
	return (
		<th
			className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 bg-gray-100"
			{...props}
		>
			{children}
		</th>
	);
};

const TableCell = ({ children, ...props }: any) => {
	return (
		<td className="border border-gray-200 px-4 py-3 text-gray-700" {...props}>
			{children}
		</td>
	);
};

export { Table, TableHead, TableBody, TableRow, TableHeader, TableCell };
