import {scaleLinear} from 'd3-scale'
import {select} from 'd3-selection'

import {first, last, sortBy, find} from './Util'
import * as React from 'react'
import Bounds from './Bounds'
import Text from './Text'
import {getRelativeMouse, formatYear, domainExtent} from './Util'
import {observable, computed, autorun, autorunAsync, action} from 'mobx'
import {observer} from 'mobx-react'

interface TimelineProps {
	years: number[],
	startYear: number,
    endYear: number,
    onTargetChange: ({ targetStartYear, targetEndYear }: { targetStartYear: number, targetEndYear: number }) => void,
	onInputChange?: ({ startYear, endYear }: { startYear: number, endYear: number }) => void,
    onStartDrag?: () => void,
    onStopDrag?: () => void,
	bounds: Bounds,
    singleYearMode?: boolean
};

@observer
export default class Timeline extends React.Component<TimelineProps> {
    props: TimelineProps
    base: SVGGElement

    @observable startYearInput: number
    @observable endYearInput: number
	@observable isPlaying: boolean = false
    @observable dragTarget: string|null

    @computed get isDragging(): boolean {
        return !!this.dragTarget
    }

	g: SVGElement

	constructor(props : TimelineProps) {
		super(props)
        action(() => {
            this.startYearInput = props.startYear
            this.endYearInput = props.endYear
        })()
	}

    componentWillMount() {
        autorun(() => {
            const { isPlaying } = this

            if (isPlaying)
                this.onStartPlaying()
            else
                this.onStopPlaying()
        })

        const {onStartDrag, onStopDrag} = this.props
        autorun(() => {
            const {isPlaying, isDragging} = this
            if (isPlaying || isDragging) {
                this.context.chart.url.debounceMode = true
                if (onStartDrag) onStartDrag()
            } else {
                this.context.chart.url.debounceMode = false
                if (onStopDrag) onStopDrag()
            }
        })

        autorunAsync(() => {
            if (this.props.onInputChange)
                this.props.onInputChange({ startYear: this.startYear, endYear: this.endYear })
        })

        autorunAsync(() => {
            if (this.props.onTargetChange)
                this.props.onTargetChange({ targetStartYear: this.targetStartYear, targetEndYear: this.targetEndYear })
        })
    }

	@computed get years(): number[] {
		return this.props.years
	}

	@computed get bounds(): Bounds {
		return this.props.bounds
	}

	@computed get minYear(): number {
		return first(this.props.years) as number
	}

	@computed get maxYear(): number {
		return last(this.props.years) as number
	}

    // Sanity check the input
    @computed get startYear(): number {
        const {startYearInput, endYearInput, minYear, maxYear} = this
        return Math.min(maxYear, Math.max(minYear, Math.min(startYearInput, endYearInput)))
    }

    // Closest year to the input start year
    // e.g. 1954 => 1955
    @computed get roundedStartYear(): number {
        const { years, startYear } = this
        return sortBy(years, year => Math.abs(year-startYear))[0]
    }

    // Previous year from the input start year
    // e.g. 1954 => 1950
    @computed get targetStartYear(): number {
        const { years, startYear } = this
        return (find(
            sortBy(years, year => Math.abs(year-startYear)),
            year => year <= startYear
        ) as number)
    }

    @computed get endYear(): number {
        const {startYearInput, endYearInput, minYear, maxYear} = this
        return Math.min(maxYear, Math.max(minYear, Math.max(startYearInput, endYearInput)))
    }

    @computed get roundedEndYear(): number {
        const { years, endYear } = this
        return sortBy(years, function(year) { return Math.abs(year-endYear); })[0]
    }

    @computed get targetEndYear(): number {
        const { years, endYear } = this
        return (find(
            sortBy(years, year => Math.abs(year-endYear)),
            year => year <= endYear
        ) as number)
    }

	@computed get minYearBox(): Bounds {
		const { minYear, bounds } = this
        const minYearBox = Bounds.forText(formatYear(minYear), { fontSize: "0.8em" })
        return minYearBox.extend({ x: bounds.left+35, y: bounds.centerY-minYearBox.height/2 })
	}

	@computed get maxYearBox(): Bounds {
		const { maxYear, bounds } = this
        const maxYearBox = Bounds.forText(formatYear(maxYear), { fontSize: "0.8em" })
        return maxYearBox.extend({ x: bounds.right-maxYearBox.width, y: bounds.centerY-maxYearBox.height/2 })
    }

	@computed get sliderBounds(): Bounds {
		const { bounds, minYearBox, maxYearBox } = this
		const sliderHeight = 12
		const left = minYearBox.left + minYearBox.width + 15
		return new Bounds(left, bounds.top + (bounds.height-sliderHeight)/2, bounds.width-maxYearBox.width-(left-bounds.left)-15, sliderHeight)
	}

	@computed get xScale(): any {
		const { years, sliderBounds } = this
		return scaleLinear().domain(domainExtent(years, 'linear')).range([sliderBounds.left, sliderBounds.left+sliderBounds.width]);
	}

	@action.bound componentWillReceiveProps(nextProps : TimelineProps) {
		const { isPlaying, isDragging } = this
		if (!isPlaying && !isDragging) {
			this.startYearInput = nextProps.startYear
            this.endYearInput = nextProps.endYear
        }
	}

	animRequest: number;

	@action.bound onStartPlaying() {
		let lastTime: number|null = null, ticksPerSec = 5;

		const playFrame = action((time : number) => {
			const { isPlaying, endYear, years, minYear, maxYear } = this
			if (!isPlaying) return;

			if (lastTime === null) {
				// If we start playing from the end, loop around to beginning
				if (endYear >= maxYear) {
                    this.startYearInput = minYear
					this.endYearInput = minYear
                }
			} else {
				const elapsed = time-lastTime;

				if (endYear >= maxYear) {
					this.isPlaying = false
				} else {
					const nextYear = years[years.indexOf(endYear)+1]
					const yearsToNext = nextYear-endYear


					this.endYearInput = endYear+(Math.max(yearsToNext/3, 1)*elapsed*ticksPerSec/1000)
                    if (this.props.singleYearMode)
                        this.startYearInput = this.endYearInput
				}
			}


			lastTime = time;
			this.animRequest = requestAnimationFrame(playFrame)
		})

		this.animRequest = requestAnimationFrame(playFrame)
	}

	onStopPlaying() {
		cancelAnimationFrame(this.animRequest)
	}

	getInputYearFromMouse(evt: MouseEvent) {
		const { sliderBounds, minYear, maxYear, base } = this
        const mouseX = getRelativeMouse(base, evt).x

        var fracWidth = (mouseX-sliderBounds.x) / sliderBounds.width,
            inputYear = minYear + fracWidth*(maxYear-minYear);

        return inputYear
	}

    dragOffsets = [0, 0]

    @action.bound onDrag(inputYear: number) {
        const {props, dragTarget, minYear, maxYear} = this

        if (props.singleYearMode) {
            this.startYearInput = inputYear
            this.endYearInput = inputYear
        } else if (dragTarget == 'start')
            this.startYearInput = inputYear
        else if (dragTarget == 'end')
            this.endYearInput = inputYear
        else if (dragTarget == 'both') {
            this.startYearInput = this.dragOffsets[0]+inputYear
            this.endYearInput = this.dragOffsets[1]+inputYear

            if (this.startYearInput < minYear) {
                this.startYearInput = minYear
                this.endYearInput = minYear+(this.dragOffsets[1]-this.dragOffsets[0])
            } else if (this.endYearInput > maxYear) {
                this.startYearInput = maxYear+(this.dragOffsets[0]-this.dragOffsets[1])
                this.endYearInput = maxYear
            }
        }
    }


    @action.bound onMouseDown(e: any) {
        // Don't do mousemove if we clicked the play or pause button
        const targetEl = select(e.target)
        if (targetEl.classed('toggle')) return;

        const {startYear, endYear} = this
        const {singleYearMode} = this.props

        const inputYear = this.getInputYearFromMouse(e)
        if (startYear == endYear && (targetEl.classed('startMarker') || targetEl.classed('endMarker')))
            this.dragTarget = 'both'
        else if (!singleYearMode && (targetEl.classed('startMarker') || inputYear <= startYear))
            this.dragTarget = 'start'
        else if (!singleYearMode && (targetEl.classed('endMarker') || inputYear >= endYear))
            this.dragTarget = 'end'
        else
            this.dragTarget = 'both'

        if (this.dragTarget == 'both')
            this.dragOffsets = [this.startYearInput-inputYear, this.endYearInput-inputYear]

        this.onDrag(inputYear)

        e.preventDefault()
    }

    @action.bound onDoubleClick(e: any) {
        const inputYear = this.getInputYearFromMouse(e)
        this.startYearInput = inputYear
        this.endYearInput = inputYear        
    }

	mouseFrameQueued: boolean

	@action.bound onMouseMove(ev: MouseEvent) {
        const {dragTarget, mouseFrameQueued} = this
		if (!dragTarget || mouseFrameQueued) return

		this.mouseFrameQueued = true
		requestAnimationFrame(() => {
			this.onDrag(this.getInputYearFromMouse(ev))
	        this.mouseFrameQueued = false
	    })
	}

    @action.bound onMouseUp() {
    	this.dragTarget = null
    }

    // Allow proper dragging behavior even if mouse leaves timeline area
    componentDidMount() {
        document.documentElement.addEventListener('mouseup', this.onMouseUp)
    	document.documentElement.addEventListener('mouseleave', this.onMouseUp)
    	document.documentElement.addEventListener('mousemove', this.onMouseMove)
    	document.documentElement.addEventListener('touchend', this.onMouseUp)
    	document.documentElement.addEventListener('touchmove', this.onMouseMove)

        autorun(() => {
            // If we're not playing or dragging, lock the input to the closest year (no interpolation)
            const {isPlaying, isDragging, roundedStartYear, roundedEndYear} = this
            if (!isPlaying && !isDragging) {
                action(() => {
                    this.startYearInput = roundedStartYear
                    this.endYearInput = roundedEndYear
                })()
            }
        })
    }

    @computed get height() {
        return this.bounds.height
    }

    componentWillUnmount() {
        document.documentElement.removeEventListener('mouseup', this.onMouseUp)
    	document.documentElement.removeEventListener('mouseleave', this.onMouseUp)
    	document.documentElement.removeEventListener('mousemove', this.onMouseMove)
    	document.documentElement.removeEventListener('touchend', this.onMouseUp)
    	document.documentElement.removeEventListener('touchmove', this.onMouseMove)
    }

  	render() {
		const { bounds, sliderBounds, minYear, maxYear, minYearBox, maxYearBox, xScale, years, isPlaying, startYear, endYear, targetStartYear, targetEndYear } = this

        const toggleText = isPlaying ? "\uf04c" : "\uf04b"
        const toggleFontSize = "1em"
        const toggleTextBounds = Bounds.forText(toggleText, { fontSize: toggleFontSize })

		return <g className="clickable" onTouchStart={this.onMouseDown} onMouseDown={this.onMouseDown}>
			<rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} fill="white"></rect>
            <Text className="toggle" onClick={() => this.isPlaying = !this.isPlaying} x={bounds.left+10} y={bounds.centerY-toggleTextBounds.height/2} fontFamily="FontAwesome" fontSize={toggleFontSize}>
                {toggleText}
			</Text>
			<Text className="minYearLabel" x={minYearBox.x} y={minYearBox.y} fontSize="0.8em" fill="#666">{formatYear(minYear)}</Text>
            <Text className="maxYearLabel" x={maxYearBox.x} y={maxYearBox.y} fontSize="0.8em" fill="#666">{maxYear.toString()}</Text>
			<g className="ticks">
				{years.slice(1, -1).map(year => {
					return <rect className="tick" x={xScale(year)} y={sliderBounds.top+sliderBounds.height-1} width="1px" height="0.2em" fill="rgba(0,0,0,0.2)" />
				})}
			</g>
			<rect className="sliderBackground" x={sliderBounds.left} y={sliderBounds.top} width={sliderBounds.width} height={sliderBounds.height} rx={5} ry={5} stroke-width={0.1} fill="#eee"/>
            <rect x={xScale(startYear)} y={sliderBounds.top} width={xScale(endYear)-xScale(startYear)} height={sliderBounds.height} fill="#3F9EFF"/>
            <TimelineHandle year={startYear} xScale={xScale} bounds={sliderBounds} label={startYear == minYear || startYear == maxYear ? '' : targetStartYear} handleClass="startMarker"/>
            <TimelineHandle year={endYear} xScale={xScale} bounds={sliderBounds} label={endYear == minYear || endYear == maxYear ? '' : targetEndYear} handleClass="endMarker"/>
		</g>
	}
}

@observer
class TimelineHandle extends React.Component<any> {
    render() {
        const {year, xScale, bounds, label, handleClass} = this.props

        return <g className="handle" fill="#3F9EFF" transform={`translate(${xScale(year)}, ${bounds.top+bounds.height/2})`}>
            <circle className={handleClass} r={8} stroke="#000" stroke-width={0.1}/>
            <text y={-9} font-size="0.7em" text-anchor="middle">
                {label}
            </text>
        </g>
    }
}
