import * as React from 'react'
import ChartEditor from './ChartEditor'
import {action} from 'mobx'
import {observer} from 'mobx-react'

@observer
export default class SaveButtons extends React.Component<{ editor: ChartEditor }> {
	@action.bound onSaveChart() {
		this.props.editor.saveChart()
	}

	@action.bound onSaveAsNew() {
		this.props.editor.saveAsNewChart()
	}

	@action.bound onPublishToggle() {
		if (this.props.editor.chart.isPublished)
			this.props.editor.unpublishChart()
		else
			this.props.editor.publishChart()
	}

	render() {
		const {editor} = this.props
		const {chart} = editor

		return <section className="form-section-submit">
			<button type="button" className="btn btn-lg btn-success btn-primary" onClick={this.onSaveChart}>
				{editor.isSaved ? "Saved" :
				 	chart.isPublished ? "Update chart" : "Save draft"}
			</button>
			{" "}<button type="button" className="btn btn-lg btn-primary" onClick={this.onSaveAsNew}>Save as new</button>
			{" "}<button type="button" className="btn btn-lg btn-danger" onClick={this.onPublishToggle}>{chart.isPublished ? "Unpublish" : "Publish"}</button>
		</section>
	}	
}