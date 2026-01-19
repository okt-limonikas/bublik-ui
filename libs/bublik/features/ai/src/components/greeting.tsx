import { SparklesIcon } from './icons';

export function Greeting() {
	return (
		<div className="mx-auto max-w-2xl px-4 grid place-items-center h-full">
			<div className="flex flex-col items-center text-center space-y-6">
				<div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
					<SparklesIcon size={24} className="text-white" />
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-bold text-text-primary">
						Welcome to Bublik Chat
					</h1>
					<p className="text-lg text-text-menu">How can I help you today?</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
					<div className="p-4 border border-border-primary rounded-lg hover:border-gray-300:border-gray-600 transition-colors cursor-pointer">
						<h3 className="font-semibold text-text-primary mb-2">
							<span role="img" aria-label="lightbulb">
								💡
							</span>
							Ask for help
						</h3>
						<p className="text-sm text-text-menu">
							Get assistance with your questions and problems
						</p>
					</div>

					<div className="p-4 border border-border-primary rounded-lg hover:border-gray-300:border-gray-600 transition-colors cursor-pointer">
						<h3 className="font-semibold text-text-primary mb-2">
							<span role="img" aria-label="chart">
								📊
							</span>
							Analyze data
						</h3>
						<p className="text-sm text-text-menu">
							Get insights and analysis from your data
						</p>
					</div>
				</div>

				<div className="text-center space-y-2">
					<p className="text-sm text-text-menu">
						Start a conversation by typing your message below
					</p>
				</div>
			</div>
		</div>
	);
}
