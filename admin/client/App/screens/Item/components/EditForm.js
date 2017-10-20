import React from 'react';
import moment from 'moment';
import assign from 'object-assign';
import {
	Form,
	FormField,
	FormInput,
	Grid,
	Modal,
	ResponsiveText,
} from '../../../elemental';

// import { css, StyleSheet } from 'aphrodite/no-important';
import { Fields } from 'FieldTypes';
import { fade } from '../../../../utils/color';
import theme from '../../../../theme';

import { Button, LoadingButton } from '../../../elemental';
import AlertMessages from '../../../shared/AlertMessages';
import ConfirmationDialog from './../../../shared/ConfirmationDialog';

import FormHeading from './FormHeading';
import AltText from './AltText';
import FooterBar from './FooterBar';
import InvalidFieldType from '../../../shared/InvalidFieldType';

import { deleteItem } from '../actions';

import { upcase } from '../../../../utils/string';

function getNameFromData (data) {
	if (typeof data === 'object') {
		if (typeof data.first === 'string' && typeof data.last === 'string') {
			return data.first + ' ' + data.last;
		} else if (data.id) {
			return data.id;
		}
	}
	return data;
}

function smoothScrollTop () {
	if (document.body.scrollTop || document.documentElement.scrollTop) {
		window.scrollBy(0, -250);
		var timeOut = setTimeout(smoothScrollTop, 10);
	} else {
		clearTimeout(timeOut);
	}
}

var EditForm = React.createClass({
	displayName: 'EditForm',
	propTypes: {
		data: React.PropTypes.object,
		list: React.PropTypes.object,
	},
	getInitialState () {
		return {
			values: assign({}, this.props.data.fields),
			confirmationDialog: null,
			loading: false,
			isShowCustomActionModal: false,
			customActionFormOptions: [],
			currentAction: null,
			lastValues: null, // used for resetting
			focusFirstField: !this.props.list.nameField && !this.props.list.nameFieldIsFormHeader,
		};
	},
	componentDidMount () {
		this.__isMounted = true;
	},
	componentWillUnmount () {
		this.__isMounted = false;
	},
	getFieldProps (field) {
		const props = assign({}, field);
		const alerts = this.state.alerts;
		// Display validation errors inline
		if (alerts && alerts.error && alerts.error.error === 'validation errors') {
			if (alerts.error.detail[field.path]) {
				// NOTE: This won't work yet, as ElementalUI doesn't allow
				// passed in isValid, only invalidates via internal state.
				// PR to fix that: https://github.com/elementalui/elemental/pull/149
				props.isValid = false;
			}
		}
		props.value = this.state.values[field.path];
		props.values = this.state.values;
		props.onChange = this.handleChange;
		props.mode = 'edit';
		return props;
	},

	renderCustomFormFields (uiElements) {
		return uiElements.map((fields, fieldsIndex) => fields.map((item, index) => {
			const value = this.props.data.fields;
			const props = {
				mode: 'edit',
				label: item.label,
				value: item.value,
				noedit: item.noedit,
				onChange: event => {
					uiElements[fieldsIndex][index].value = event.value;
					this.setState({ customActionFormOptions: uiElements });
				},
			};

			if (item.isDynamic) {
				if (item.option) {
					props.value = value[item.option];
				} else if (item.options) {
					props.defaultValue = this.getValue(item.options, value);
				}
			}

			if (item.type === 'select') {
				props.ops = this.getValue(item.options, value).map(ops => {
					return {
						label: ops[item.ops.label],
						value: ops[item.ops.value],
					};
				});
			}

			return React.createElement(Fields[item.type], props);
		}));
	},
	hideCustomActionsModal () {
		this.setState({
			isShowCustomActionModal: false,
			customActionFormOptions: [],
		});
	},

	isDone (customActionFormOptions) {
		return customActionFormOptions.every(options => options.every(item => item.value));
	},

	renderCustomActionsModal () {
		const { customActionFormOptions, loading, isShowCustomActionModal, alerts } = this.state;
		return (
			<Modal.Dialog
				backdropClosesModal
				onClose={this.hideCustomActionsModal.bind(this)}
				isOpen={isShowCustomActionModal}
			>
				<h2 style={{ marginTop: '0.66em' }}>请填写相关信息</h2>
				{alerts ? <AlertMessages alerts={this.state.alerts} /> : null}
				<div style={{ height: '500px', overflow: 'auto' }}>
					{this.renderCustomFormFields(customActionFormOptions)}
					{customActionFormOptions.length > 1 && <div style={{ width: '100%', borderBottom: '1px solid #ddd' }}></div> }
				</div>
				<div
					style={{ display: 'flex', padding: '1em', justifyContent: 'space-around'}}
				>
					<LoadingButton
						color="primary"
						disabled={loading}
						loading={loading}
						onClick={() => {
							const { currentAction, customActionFormOptions } = this.state;
							if (!this.isDone(customActionFormOptions)) {
								return this.setState({ alerts: { error: { error: '所有信息必须填写全' } } });
							}
							this.setState({ loading: true });
							this.callCustomAction(currentAction, this.props.data, customActionFormOptions);
						}}
						data-button="update"
					>
						确定
					</LoadingButton>
					<Button disabled={loading} onClick={this.hideCustomActionsModal.bind(this)} color="cancel">
						取消
					</Button>
				</div>
			</Modal.Dialog>
		);
	},

	getValue (str, obj) {
		return str.split('.').reduce((x, y) => {
			if (Array.isArray(x)) {
				return x.map(item => item[y]);
			}

			return x[y];
		}, obj);
	},

	callCustomAction (customAction, value, sendData) {
		if (this.state.loading) {
			return;
		}

		this.props.list.callCustomAction(customAction, value, sendData, (err, data) => {
			const handleError = e => {
				smoothScrollTop();
				this.hideCustomActionsModal();
				this.setState({
					alerts: {
						error: { error: e.message },
					},
					loading: false,
				});
			};

			if (err) {
				return handleError(err);
			}

			this.props.list.loadItem(data._id, { drilldown: true }, (err, value) => {
				if (err) {
					return handleError(err);
				}

				smoothScrollTop();
				this.hideCustomActionsModal();
				this.setState({
					alerts: {
						success: {
							success: 'Your changes have been saved successfully',
						},
					},
					lastValues: this.state.values,
					values: value.fields,
					loading: false,
				});

			});
		});
	},

	handleCustomAction (customAction) {
		let promptValue = '';
		const value = this.props.data;
		if (customAction.needPrompt) {
			promptValue = window.prompt(customAction.promptText);
			if (!promptValue) {
				return;
			}
		}
		if (customAction.needForm) {
			const optionsLength = customAction.formCount || this.getValue(customAction.formCountBy, value.fields).length || 1;
			const customActionFormOptions = [];
			for (let i = 0; i < optionsLength; i++) {
				customActionFormOptions.push(customAction.formKeys);
			}
			return this.setState({
				isShowCustomActionModal: true,
				currentAction: customAction,
				customActionFormOptions: customActionFormOptions,
			});
		}
		this.setState({ loading: true });

		this.callCustomAction(customAction, value, promptValue);
	},

	handleChange (event) {
		const values = assign({}, this.state.values);

		values[event.path] = event.value;
		this.setState({ values });
	},

	toggleDeleteDialog () {
		this.setState({
			deleteDialogIsOpen: !this.state.deleteDialogIsOpen,
		});
	},
	toggleResetDialog () {
		this.setState({
			resetDialogIsOpen: !this.state.resetDialogIsOpen,
		});
	},
	handleReset () {
		this.setState({
			values: assign({}, this.state.lastValues || this.props.data.fields),
			resetDialogIsOpen: false,
		});
	},
	handleDelete () {
		const { data } = this.props;
		this.props.dispatch(deleteItem(data.id, this.props.router));
	},
	handleKeyFocus () {
		const input = this.refs.keyOrIdInput;
		input.select();
	},
	removeConfirmationDialog () {
		this.setState({
			confirmationDialog: null,
		});
	},
	updateItem () {
		const { data, list } = this.props;
		const editForm = this.refs.editForm;
		const formData = new FormData(editForm);

		// Show loading indicator
		this.setState({
			loading: true,
		});

		list.updateItem(data.id, formData, (err, data) => {
			smoothScrollTop();
			if (err) {
				this.setState({
					alerts: {
						error: err,
					},
					loading: false,
				});
			} else {
				// Success, display success flash messages, replace values
				// TODO: Update key value
				this.setState({
					alerts: {
						success: {
							success: 'Your changes have been saved successfully',
						},
					},
					lastValues: this.state.values,
					values: data.fields,
					loading: false,
				});
			}
		});
	},
	renderKeyOrId () {
		var className = 'EditForm__key-or-id';
		var list = this.props.list;

		if (list.nameField && list.autokey && this.props.data[list.autokey.path]) {
			return (
				<div className={className}>
					<AltText
						modified="ID:"
						normal={`${upcase(list.autokey.path)}: `}
						title="Press <alt> to reveal the ID"
						className="EditForm__key-or-id__label" />
					<AltText
						modified={<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data.id} className="EditForm__key-or-id__input" readOnly />}
						normal={<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data[list.autokey.path]} className="EditForm__key-or-id__input" readOnly />}
						title="Press <alt> to reveal the ID"
						className="EditForm__key-or-id__field" />
				</div>
			);
		} else if (list.autokey && this.props.data[list.autokey.path]) {
			return (
				<div className={className}>
					<span className="EditForm__key-or-id__label">{list.autokey.path}: </span>
					<div className="EditForm__key-or-id__field">
						<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data[list.autokey.path]} className="EditForm__key-or-id__input" readOnly />
					</div>
				</div>
			);
		} else if (list.nameField) {
			return (
				<div className={className}>
					<span className="EditForm__key-or-id__label">ID: </span>
					<div className="EditForm__key-or-id__field">
						<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data.id} className="EditForm__key-or-id__input" readOnly />
					</div>
				</div>
			);
		}
	},
	renderNameField () {
		var nameField = this.props.list.nameField;
		var nameFieldIsFormHeader = this.props.list.nameFieldIsFormHeader;
		var wrapNameField = field => (
			<div className="EditForm__name-field">
				{field}
			</div>
		);
		if (nameFieldIsFormHeader) {
			var nameFieldProps = this.getFieldProps(nameField);
			nameFieldProps.label = null;
			nameFieldProps.size = 'full';
			nameFieldProps.autoFocus = true;
			nameFieldProps.inputProps = {
				className: 'item-name-field',
				placeholder: nameField.label,
				size: 'large',
			};
			return wrapNameField(
				React.createElement(Fields[nameField.type], nameFieldProps)
			);
		} else {
			return wrapNameField(
				<h2>{this.props.data.name || '(no name)'}</h2>
			);
		}
	},
	renderFormElements () {
		var headings = 0;

		return this.props.list.uiElements.map((el, index) => {
			// Don't render the name field if it is the header since it'll be rendered in BIG above
			// the list. (see renderNameField method, this is the reverse check of the one it does)
			if (
				this.props.list.nameField
				&& el.field === this.props.list.nameField.path
				&& this.props.list.nameFieldIsFormHeader
			) return;

			if (el.type === 'heading') {
				headings++;
				el.options.values = this.state.values;
				el.key = 'h-' + headings;
				return React.createElement(FormHeading, el);
			}

			if (el.type === 'field') {
				var field = this.props.list.fields[el.field];
				var props = this.getFieldProps(field);
				if (typeof Fields[field.type] !== 'function') {
					return React.createElement(InvalidFieldType, { type: field.type, path: field.path, key: field.path });
				}
				props.key = field.path;
				if (index === 0 && this.state.focusFirstField) {
					props.autoFocus = true;
				}
				return React.createElement(Fields[field.type], props);
			}
		}, this);
	},
	filterCustomActions () {
		const { customActions = [] } = this.props.list;
		const { values } = this.state;
		return customActions.filter(item => {
			if (item.pageName !== 'detail') {
				return false;
			}

			if (!item.dependsOn) {
				return true;
			}

			return item.dependsOn.every(options => options.values.includes(values[options.key]));
		});
	},
	renderFooterBar () {
		if (this.props.list.noedit && this.props.list.nodelete) {
			return null;
		}

		const { loading } = this.state;
		const loadingButtonText = loading ? 'Saving' : 'Save';
		const customActions = this.filterCustomActions();
		// Padding must be applied inline so the FooterBar can determine its
		// innerHeight at runtime. Aphrodite's styling comes later...

		return (
			<FooterBar style={styles.footerbar}>
				<div style={styles.footerbarInner}>
					{!this.props.list.noedit && (
						<LoadingButton
							color="primary"
							disabled={loading}
							loading={loading}
							onClick={this.updateItem}
							data-button="update"
						>
							{loadingButtonText}
						</LoadingButton>
					)}
					{
						!this.props.list.noedit && customActions.map(item => (
							<LoadingButton
								color="primary"
								disabled={loading}
								loading={loading}
								onClick={this.handleCustomAction.bind(this, item)}
								data-button="update"
							>
								{item.name}
							</LoadingButton>
						))
					}
					{!this.props.list.noedit && (
						<Button disabled={loading} onClick={this.toggleResetDialog} variant="link" color="cancel" data-button="reset">
							<ResponsiveText
								hiddenXS="reset changes"
								visibleXS="reset"
							/>
						</Button>
					)}
					{!this.props.list.nodelete && (
						<Button disabled={loading} onClick={this.toggleDeleteDialog} variant="link" color="delete" style={styles.deleteButton} data-button="delete">
							<ResponsiveText
								hiddenXS={`delete ${this.props.list.singular.toLowerCase()}`}
								visibleXS="delete"
							/>
						</Button>
					)}
				</div>
			</FooterBar>
		);
	},
	renderTrackingMeta () {
		// TODO: These fields are visible now, so we don't want this. We may revisit
		// it when we have more granular control over hiding fields in certain
		// contexts, so I'm leaving this code here as a reference for now - JW
		if (true) return null; // if (true) prevents unreachable code linter errpr

		if (!this.props.list.tracking) return null;

		var elements = [];
		var data = {};

		if (this.props.list.tracking.createdAt) {
			data.createdAt = this.props.data.fields[this.props.list.tracking.createdAt];
			if (data.createdAt) {
				elements.push(
					<FormField key="createdAt" label="Created on">
						<FormInput noedit title={moment(data.createdAt).format('DD/MM/YYYY h:mm:ssa')}>{moment(data.createdAt).format('Do MMM YYYY')}</FormInput>
					</FormField>
				);
			}
		}

		if (this.props.list.tracking.createdBy) {
			data.createdBy = this.props.data.fields[this.props.list.tracking.createdBy];
			if (data.createdBy && data.createdBy.name) {
				let createdByName = getNameFromData(data.createdBy.name);
				if (createdByName) {
					elements.push(
						<FormField key="createdBy" label="Created by">
							<FormInput noedit>{data.createdBy.name.first} {data.createdBy.name.last}</FormInput>
						</FormField>
					);
				}
			}
		}

		if (this.props.list.tracking.updatedAt) {
			data.updatedAt = this.props.data.fields[this.props.list.tracking.updatedAt];
			if (data.updatedAt && (!data.createdAt || data.createdAt !== data.updatedAt)) {
				elements.push(
					<FormField key="updatedAt" label="Updated on">
						<FormInput noedit title={moment(data.updatedAt).format('DD/MM/YYYY h:mm:ssa')}>{moment(data.updatedAt).format('Do MMM YYYY')}</FormInput>
					</FormField>
				);
			}
		}

		if (this.props.list.tracking.updatedBy) {
			data.updatedBy = this.props.data.fields[this.props.list.tracking.updatedBy];
			if (data.updatedBy && data.updatedBy.name) {
				let updatedByName = getNameFromData(data.updatedBy.name);
				if (updatedByName) {
					elements.push(
						<FormField key="updatedBy" label="Updated by">
							<FormInput noedit>{data.updatedBy.name.first} {data.updatedBy.name.last}</FormInput>
						</FormField>
					);
				}
			}
		}

		return Object.keys(elements).length ? (
			<div className="EditForm__meta">
				<h3 className="form-heading">Meta</h3>
				{elements}
			</div>
		) : null;
	},
	render () {
		return (
			<form ref="editForm" className="EditForm-container">
				{(this.state.alerts) ? <AlertMessages alerts={this.state.alerts} /> : null}
				<Grid.Row>
					<Grid.Col large="three-quarters">
						<Form layout="horizontal" component="div">
							{this.renderNameField()}
							{this.renderKeyOrId()}
							{this.renderFormElements()}
							{this.renderTrackingMeta()}
						</Form>
					</Grid.Col>
					<Grid.Col large="one-quarter"><span /></Grid.Col>
				</Grid.Row>
				{this.renderFooterBar()}
				<ConfirmationDialog
					confirmationLabel="Reset"
					isOpen={this.state.resetDialogIsOpen}
					onCancel={this.toggleResetDialog}
					onConfirmation={this.handleReset}
				>
					<p>Reset your changes to <strong>{this.props.data.name}</strong>?</p>
				</ConfirmationDialog>
				{this.renderCustomActionsModal()}
				<ConfirmationDialog
					confirmationLabel="Delete"
					isOpen={this.state.deleteDialogIsOpen}
					onCancel={this.toggleDeleteDialog}
					onConfirmation={this.handleDelete}
				>
					Are you sure you want to delete <strong>{this.props.data.name}?</strong>
					<br />
					<br />
					This cannot be undone.
				</ConfirmationDialog>
			</form>
		);
	},
});

const styles = {
	footerbar: {
		backgroundColor: fade(theme.color.body, 93),
		boxShadow: '0 -2px 0 rgba(0, 0, 0, 0.1)',
		paddingBottom: 20,
		paddingTop: 20,
		zIndex: 99,
	},
	footerbarInner: {
		height: theme.component.height, // FIXME aphrodite bug
	},
	deleteButton: {
		float: 'right',
	},
};

module.exports = EditForm;
