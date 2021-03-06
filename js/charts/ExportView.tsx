/* ExportView
 * ================
 *
 * This component is responsible for getting the chart into a nice state for phantomjs
 * to take a PNG screenshot, and serializing the SVG for export.
 *
 * @project Our World In Data
 * @author  Jaiden Mispy
 * @created 2016-08-09
 */

import * as React from 'react'
import * as ReactDOMServer from 'react-dom/server'
import Bounds from './Bounds'
import ChartView from './ChartView'
import {when} from 'mobx'
import ChartConfig, {ChartConfigProps} from './ChartConfig'

declare const App: any

export default class ExportView {
    static bootstrap({ jsonConfig }: { jsonConfig: ChartConfigProps }) {
        const targetWidth = App.IDEAL_WIDTH, targetHeight = App.IDEAL_HEIGHT;
        const targetBounds = new Bounds(0, 0, targetWidth, targetHeight)

        const chart = new ChartConfig(jsonConfig)

        // setTimeout is to give the urlbinder a chance to update the selection
        when(
            () => chart.data.isReady,
            () => setTimeout(() => {
                Bounds.baseFontSize = 24
                Bounds.baseFontFamily = "Helvetica, Arial"

                const svg = ReactDOMServer.renderToStaticMarkup(<ChartView
                    chart={chart}
                    isExport={true}
                    bounds={targetBounds}/>)

                Array.from(document.querySelectorAll("link")).forEach(el => (el.parentNode as Node).removeChild(el))
                document.body.innerHTML = svg
                requestAnimationFrame(() => console.log(document.body.innerHTML))
            }, 0)
        )

    }
}
