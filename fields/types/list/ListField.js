/* eslint-disable react/jsx-no-bind */

import assign from 'object-assign';
import { css, StyleSheet } from 'aphrodite/no-important';
import React from 'react';
import Field from '../Field';
import Domify from 'react-domify';

import { Fields } from 'FieldTypes';
import { Button, GlyphButton } from '../../../admin/client/App/elemental';
import InvalidFieldType from '../../../admin/client/App/shared/InvalidFieldType';

let i = 0;
function generateId () {
	return i++;
};

const ItemDom = ({ name, id, onRemove, itemDomstyle, children }) => (
	<div style={itemDomstyle}>
		{name && <input type="hidden" name={name} value={id}/>}
		{children}
		<div style={{ textAlign: 'right', paddingBottom: 10 }}>
			{
				onRemove && <Button size="xsmall" color="danger" onClick={onRemove}>
					Remove
				</Button>
			}
		</div>
	</div>
);

const getGridSize = (grid) => {
	if (typeof grid === 'number' || Number(grid)) {
		return Number(grid);
	}

	if (typeof grid === 'string' && grid.indexOf('%') > 0) {
		return grid;
	}

	return '18%';
};

module.exports = Field.create({
	displayName: 'ListField',
	statics: {
		type: 'List',
	},
	propTypes: {
		fields: React.PropTypes.object.isRequired,
		label: React.PropTypes.string,
		onChange: React.PropTypes.func.isRequired,
		path: React.PropTypes.string.isRequired,
		value: React.PropTypes.array,
	},
	addItem () {
		const { path, value, onChange } = this.props;
		onChange({
			path,
			value: [
				...value,
				{
					id: generateId(),
					_isNew: true,
				},
			],
		});
	},
	removeItem (index) {
		const { value: oldValue, path, onChange } = this.props;
		const value = oldValue.slice(0, index).concat(oldValue.slice(index + 1));
		onChange({ path, value });
	},
	handleFieldChange (index, event) {
		const { value: oldValue, path, onChange } = this.props;
		const head = oldValue.slice(0, index);
		const item = {
			...oldValue[index],
			[event.path]: event.value,
		};
		const tail = oldValue.slice(index + 1);
		const value = [...head, item, ...tail];
		onChange({ path, value });
	},
	renderFieldsForItem (index, value, grid) {
		return Object.keys(this.props.fields).map((path) => {
			const field = this.props.fields[path];
			if (typeof Fields[field.type] !== 'function') {
				return React.createElement(InvalidFieldType, { type: field.type, path: field.path, key: field.path });
			}
			const props = assign({}, field);
			props.value = value[field.path];
			props.values = value;
			props.onChange = this.handleFieldChange.bind(this, index);
			props.mode = 'edit';
			props.inputNamePrefix = `${this.props.path}[${index}]`;
			props.key = field.path;
			props.grid = grid;
			// TODO ?
			// if (props.dependsOn) {
			// 	props.currentDependencies = {};
			// 	Object.keys(props.dependsOn).forEach(dep => {
			// 		props.currentDependencies[dep] = this.state.values[dep];
			// 	});

			return React.createElement(Fields[field.type], props);
		}, this);
	},
	handleListLengthChanged (value, values) {
		if (typeof value === 'boolean') {
			return value;
		}
		if (typeof value === 'object' && value.dependsOn) {
			return Object.keys(value.dependsOn).every(item => {
				if (Array.isArray(value.dependsOn[item])) {
					return value.dependsOn[item].some(x => x === values[item]);
				}
				return value.dependsOn[item] === values[item];
			});
		}
		return false;
	},
	renderItems () {
		const { value = [], path, grid, noadd, nodelete, values } = this.props;
		const onAdd = this.addItem;
		const gridSize = grid ? getGridSize(grid) : undefined;
		const style = grid ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' } : {};
		const itemDomstyle = grid
		? {
			display: 'flex',
			boxSizing: 'border-box',
			flexDirection: 'column',
			alignItems: 'flex-start',
			width: gridSize,
			maxWidth: 224,
			margin: 10,
			marginLeft: 0,
			marginBottom: 15,
			padding: 10,
			border: '2px solid #eee' } : {
				borderTop: '2px solid #eee',
				paddingTop: 15,
			};
		const noAddFlag = this.handleListLengthChanged(noadd, values);
		const noDeleteFlag = this.handleListLengthChanged(nodelete, values);
		return (
			<div>
				<div style={style}>
					{value.length === 0 && <input type="hidden" name={path} value="" />}
					{value.map((value, index) => {
						const { id, _isNew } = value;
						const name = !_isNew && `${path}[${index}][id]`;
						const onRemove = noDeleteFlag ? null : e => this.removeItem(index);

						return (
							<ItemDom key={id} {...{ id, name, onRemove, itemDomstyle }}>
								{this.renderFieldsForItem(index, value, grid)}
							</ItemDom>
						);
					})}
				</div>
				{
					!noAddFlag
					&& <GlyphButton color="success" glyph="plus" size="small" position="left" onClick={onAdd}>
						Add
					</GlyphButton>
				}
			</div>
		);
	},
	renderUI () {
		const { label, value } = this.props;
		return (
			<div className={css(classes.container)}>
				<h3 data-things="whatever" className={css(classes.header)}>{label}</h3>
				{this.shouldRenderField() ? (
					this.renderItems()
				) : (
					<Domify value={value} />
				)}
				{this.renderNote()}
			</div>
		);
	},
});

const classes = StyleSheet.create({
	container: {
		marginTop: '2em',
	},
	header: {
		borderBottom: '2px solid #DEDEDE',
		paddingBottom: '8px',
	},
});
