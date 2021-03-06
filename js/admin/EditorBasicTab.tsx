import * as React from 'react'
import {includes, sample, sampleSize} from '../charts/Util'
import {observable, action, reaction, IReactionDisposer} from 'mobx'
import {observer} from 'mobx-react'
import {DimensionSlot} from '../charts/ChartConfig'
import {ChartTypeType} from '../charts/ChartType'
import {Toggle} from './Forms'
import DimensionWithData from '../charts/DimensionWithData'
import ChartEditor, {Variable} from './ChartEditor'
import VariableSelector from './VariableSelector'
import DimensionCard from './DimensionCard'
const styles = require("./EditorBasicTab.css")

@observer
class DimensionSlotView extends React.Component<{ slot: DimensionSlot, editor: ChartEditor }> {
	@observable.ref isSelectingVariables: boolean = false

	@action.bound onVariables(variableIds: number[]) {
		const {slot} = this.props

		slot.dimensions = variableIds.map(id => {
			const existingDimension = slot.dimensions.find(d => d.variableId == id)
			return existingDimension || slot.createDimension(id)
		})

		this.isSelectingVariables = false
		this.updateDefaults()
	}

	@action.bound onRemoveDimension(dim: DimensionWithData) {
		this.props.slot.dimensions = this.props.slot.dimensions.filter(d => d.variableId != dim.variableId)
		this.updateDefaults()
	}

	dispose: IReactionDisposer
	updateDefaults() {
		const {chart} = this.props.editor

		if (this.dispose) this.dispose()
		this.dispose = reaction(
			() => chart.type && chart.data.primaryDimensions,
			() => {
				if (chart.isScatter || chart.isSlopeChart) {
					chart.data.selectedKeys = []
				} else if (chart.data.primaryDimensions.length > 1) {
					const entity = includes(chart.data.availableEntities, "World") ? "World" : sample(chart.data.availableEntities)
					chart.data.selectedKeys = chart.data.availableKeys.filter(key => chart.data.lookupKey(key).entity == entity)
					chart.props.addCountryMode = 'change-country'
				} else {
					chart.data.selectedKeys = chart.data.availableKeys.length > 10 ? sampleSize(chart.data.availableKeys, 3) : chart.data.availableKeys
					chart.props.addCountryMode = 'add-country'
				}
			}
		)
	}

	componentWillUnmount() {
		if (this.dispose) this.dispose()
	}

	render() {
		const {isSelectingVariables} = this
		const {slot, editor} = this.props
		const canAddMore = slot.allowMultiple || slot.dimensions.length == 0

		return <div>
			<h5>{slot.name}</h5>
			{slot.dimensionsWithData.map(dim => {
				return dim.property == slot.property && <DimensionCard dimension={dim} editor={editor} onEdit={slot.allowMultiple ? undefined : action(() => this.isSelectingVariables = true)} onRemove={slot.isOptional ? () => this.onRemoveDimension(dim) : undefined}/>
			})}
			{canAddMore && <div className="dimensionSlot" onClick={action(() => this.isSelectingVariables = true)}>Add variable{slot.allowMultiple && 's'}</div>}
			{isSelectingVariables && <VariableSelector editor={editor} slot={slot} onDismiss={action(() => this.isSelectingVariables = false)} onComplete={this.onVariables}/>}
		</div>
	}
}

@observer
class VariablesSection extends React.Component<{ editor: ChartEditor }> {
	base: HTMLDivElement
	@observable.ref isAddingVariable: boolean = false
	@observable.struct unassignedVariables: Variable[] = []

	render() {
		const {props} = this
		const {dimensionSlots} = props.editor.chart

		return <section className="add-data-section">
			<h2>Add variables</h2>
			{dimensionSlots.map(slot => <DimensionSlotView slot={slot} editor={props.editor}/>)}
		</section>
	}
}

@observer
export default class EditorBasicTab extends React.Component<{ editor: ChartEditor }> {
	@action.bound onChartType(evt: React.FormEvent<HTMLSelectElement>) { this.props.editor.chart.props.type = (evt.currentTarget.value as ChartTypeType) }

	render() {
		const {editor} = this.props
		const {chart} = editor

		return <div className={"tab-pane active " + styles.EditorBasicTab}>
			<section className="chart-type-section">
				<h2>What type of chart</h2>
				<select className="form-control chart-type-select" onChange={this.onChartType} ref={el => { if (el) el.value = chart.type }}>
					<option value="" disabled>Select type</option>
					<option value="LineChart">Line Chart</option>
					<option value="SlopeChart">Slope Chart</option>
					<option value="ScatterPlot">Scatter Plot</option>
					<option value="StackedArea">Stacked Area</option>
					<option value="DiscreteBar">Discrete Bar</option>
				</select>
				<Toggle label="Chart tab" value={chart.props.hasChartTab} onValue={value => chart.props.hasChartTab = value}/>
				{" "}<Toggle label="Map tab" value={chart.props.hasMapTab} onValue={value => chart.props.hasMapTab = value}/>
			</section>
			<VariablesSection editor={editor}/>
		</div>
	}
}