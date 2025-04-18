/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
export const twTheme = {
	version: 1,
	themeName: 'tw-theme',
	theme: {
		seriesCnt: '3',
		backgroundColor: 'rgba(255,255,255,1)',
		titleColor: '#454c58',
		subtitleColor: '#454c58',
		textColorShow: false,
		textColor: '#333',
		markTextColor: '#454c58',
		color: ['#7283e2', '#ca75ff', '#ffd645', '#ff951c', '#3fb1e3', '#6270a1'],
		borderColor: 'transparent',
		borderWidth: 0,
		visualMapColor: ['#00afff', '#afe8ff'],
		legendTextColor: '#454c58',
		kColor: '#e6a0d2',
		kColor0: 'transparent',
		kBorderColor: '#e6a0d2',
		kBorderColor0: '#3fb1e3',
		kBorderWidth: '2',
		lineWidth: '2',
		symbolSize: '8',
		symbol: 'circle',
		symbolBorderWidth: '2',
		lineSmooth: false,
		graphLineWidth: '1',
		graphLineColor: '#cccccc',
		mapLabelColor: '#ffffff',
		mapLabelColorE: '#3fb1e3',
		mapBorderColor: '#aaaaaa',
		mapBorderColorE: '#3fb1e3',
		mapBorderWidth: 0.5,
		mapBorderWidthE: 1,
		mapAreaColor: '#eeeeee',
		mapAreaColorE: 'rgba(63,177,227,0.25)',
		axes: [
			{
				type: 'all',
				name: '通用坐标轴',
				axisLineShow: true,
				axisLineColor: '#cccccc',
				axisTickShow: true,
				axisTickColor: 'rgba(221,227,235,0.6)',
				axisLabelShow: true,
				axisLabelColor: '#454c58',
				splitLineShow: true,
				splitLineColor: ['rgba(221,227,235,0.6)'],
				splitAreaShow: false,
				splitAreaColor: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)']
			},
			{
				type: 'category',
				name: '类目坐标轴',
				axisLineShow: true,
				axisLineColor: '#333',
				axisTickShow: true,
				axisTickColor: '#333',
				axisLabelShow: true,
				axisLabelColor: '#333',
				splitLineShow: false,
				splitLineColor: ['#ccc'],
				splitAreaShow: false,
				splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
			},
			{
				type: 'value',
				name: '数值坐标轴',
				axisLineShow: true,
				axisLineColor: '#333',
				axisTickShow: true,
				axisTickColor: '#333',
				axisLabelShow: true,
				axisLabelColor: '#333',
				splitLineShow: true,
				splitLineColor: ['#ccc'],
				splitAreaShow: false,
				splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
			},
			{
				type: 'log',
				name: '对数坐标轴',
				axisLineShow: true,
				axisLineColor: '#333',
				axisTickShow: true,
				axisTickColor: '#333',
				axisLabelShow: true,
				axisLabelColor: '#333',
				splitLineShow: true,
				splitLineColor: ['#ccc'],
				splitAreaShow: false,
				splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
			},
			{
				type: 'time',
				name: '时间坐标轴',
				axisLineShow: true,
				axisLineColor: '#333',
				axisTickShow: true,
				axisTickColor: '#333',
				axisLabelShow: true,
				axisLabelColor: '#333',
				splitLineShow: true,
				splitLineColor: ['#ccc'],
				splitAreaShow: false,
				splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
			}
		],
		axisSeperateSetting: false,
		toolboxColor: '#454c58',
		toolboxEmphasisColor: '#454c58',
		tooltipAxisColor: '#454c58',
		tooltipAxisWidth: '1',
		timelineLineColor: '#626c91',
		timelineLineWidth: 1,
		timelineItemColor: '#626c91',
		timelineItemColorE: '#626c91',
		timelineCheckColor: '#3fb1e3',
		timelineCheckBorderColor: '#3fb1e3',
		timelineItemBorderWidth: 1,
		timelineControlColor: '#626c91',
		timelineControlBorderColor: '#626c91',
		timelineControlBorderWidth: 0.5,
		timelineLabelColor: '#626c91',
		datazoomBackgroundColor: 'rgba(255,255,255,0)',
		datazoomDataColor: 'rgba(222,222,222,1)',
		datazoomFillColor: 'rgba(114,230,212,0.25)',
		datazoomHandleColor: '#cccccc',
		datazoomHandleWidth: '100',
		datazoomLabelColor: '#999999'
	}
} as const;
