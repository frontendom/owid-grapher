import {isEmpty, each, reduce, map, max} from './Util'
import {computed} from 'mobx'
import FontSize from './FontSize'
import {defaultTo} from './Util'
import Bounds from './Bounds'
import * as React from 'react'

export interface TextWrapProps {
    text: string,
    maxWidth: number,
    lineHeight?: number,
    fontSize?: FontSize,
    raw?: true
}

interface WrapLine {
    text: string,
    width: number,
    height: number
}

function strip(html: string)
{
   return html.replace(/<\/?[^>]+>/g, "");
}

export default class TextWrap {
    props: TextWrapProps
    constructor(props: TextWrapProps) {
        this.props = props
    }    

    @computed get maxWidth(): number { return defaultTo(this.props.maxWidth, Infinity) }
    @computed get lineHeight(): number { return defaultTo(this.props.lineHeight, 1.1) }
    @computed get fontSize(): FontSize { return defaultTo(this.props.fontSize, 1) }
    @computed get text(): string { return this.props.text }

    @computed get lines(): WrapLine[] {
        const {text, maxWidth, lineHeight, fontSize} = this

        const words = isEmpty(text) ? [] : text.split(' ')
        const lines: WrapLine[] = []

        let line: string[] = []
        let lineBounds = Bounds.empty()

        each(words, (word, i) => {
            let nextLine = line.concat([word])
            let nextBounds = Bounds.forText(strip(nextLine.join(' ')), {fontSize: fontSize+'em'})

            const newlines = (word.match(/\n/g)||[]).length

            if (nextBounds.width > maxWidth && line.length >= 1) {
                lines.push({ text: line.join(' '), width: lineBounds.width, height: lineBounds.height })
                line = [word]
                lineBounds = Bounds.forText(strip(word), {fontSize: fontSize+'em'})
            } else {
                line = nextLine
                lineBounds = nextBounds
            }

            for (var i = 0; i < newlines; i++) {
                lines.push({ text: "", width: 0, height: lineHeight })
            }
        })
        if (line.length > 0)
            lines.push({ text: line.join(' '), width: lineBounds.width, height: lineBounds.height })

        return lines
    }


    @computed get height(): number {
        return reduce(this.lines, (total, line) => total+line.height, 0) + this.lineHeight*(this.lines.length-1)
    }

    @computed get width(): number {
        return defaultTo(max(this.lines.map(l => l.width)), 0)
    }

	render(x: number, y: number, options?: React.SVGAttributes<SVGTextElement>) {
        const {props, lines, fontSize, lineHeight} = this

        if (lines.length == 0)
            return null

        const yOffset = y+lines[0].height-lines[0].height*0.2
		return <text fontSize={(fontSize*Bounds.baseFontSize).toFixed(2)} x={x.toFixed(1)} y={yOffset.toFixed(1)} {...options}>
			{map(lines, (line, i) => {
                if (props.raw)
                    return <tspan x={x} y={yOffset + (i == 0 ? 0 : lineHeight*fontSize*Bounds.baseFontSize*i)} dangerouslySetInnerHTML={{__html: line.text}}/>
                else
    				return <tspan x={x} y={yOffset + (i == 0 ? 0 : lineHeight*fontSize*Bounds.baseFontSize*i)}>{strip(line.text)}</tspan>
			})}
		</text>
	}    
}