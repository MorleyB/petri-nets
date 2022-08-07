/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Sun Aug 07 2022 14:02:17 GMT-0500 (Central Daylight Time).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames'
], function (
    CONSTANTS,
    GMEConcepts,
    nodePropertyNames
) {

    'use strict';

    function PetriNetVizControl(options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
    }

    PetriNetVizControl.prototype._initWidgetEventHandlers = function () {
        this._widget.onNodeClick = function (id) {
            // Change the current active object
            WebGMEGlobal.State.registerActiveObject(id);
        };
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    PetriNetVizControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            self = this;

        self._logger.debug('activeObject nodeId \'' + nodeId + '\'');

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
        }

        self._currentNodeId = nodeId;
        self._currentNodeParentId = undefined;

        if (typeof self._currentNodeId === 'string') {
            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = {children: 0};  // Territory "rule"

            self._widget.setTitle(desc.name.toUpperCase());

            if (typeof desc.parentId === 'string') {
                self.$btnModelHierarchyUp.show();
            } else {
                self.$btnModelHierarchyUp.hide();
            }

            self._currentNodeParentId = desc.parentId;

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);

            self._selfPatterns[nodeId] = {children: 1};
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    // This next function retrieves the relevant node information for the widget
    PetriNetVizControl.prototype._getObjectDescriptor = function (nodeId) {
        var node = this._client.getNode(nodeId),
            objDescriptor;
        if (node) {
            objDescriptor = {
                id: node.getId(),
                name: node.getAttribute(nodePropertyNames.Attributes.name),
                childrenIds: node.getChildrenIds(),
                parentId: node.getParentId(),
                isConnection: GMEConcepts.isConnection(nodeId)
            };
        }

        return objDescriptor;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    PetriNetVizControl.prototype._eventCallback = function (events) {
        const self = this;
        console.log(events);
        events.forEach(event => {
            if (event.eid && 
                event.eid === self._currentNodeId ) {
                    if (event.etype == 'load' || event.etype == 'update') {
                        self._networkRootLoaded = true;
                    } else {
                        self.clearPetri();
                        return;
                    }
                }
        });

        this._logger.debug('_eventCallback \'' + events.length + '\' items - DONE');
        if (events.length && events[0].etype === 'complete' && self._networkRootLoaded) {
            // complete means we got all requested data and we do not have to wait for additional load cycles
            self._initNetwork();
        }
    };

    PetriNetVizControl.prototype._onLoad = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        this._widget.addNode(description);
    };

    PetriNetVizControl.prototype._onUpdate = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        this._widget.updateNode(description);
    };

    PetriNetVizControl.prototype._onUnload = function (gmeId) {
        this._widget.removeNode(gmeId);
    };

    PetriNetVizControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    PetriNetVizControl.prototype._initNetwork = function () {
        const self = this;
        //just for the ease of use, lets create a META dictionary
        const rawMETA = self._client.getAllMetaNodes();
        const META = {};
        rawMETA.forEach(node => {
            META[node.getAttribute('name')] = node.getId(); //we just need the id...
        });
        console.log(META)
        //now we collect all data we need for network visualization
        //we need our states (names, position, type), need the set of next state (with event names)
        const smNode = self._client.getNode(self._currentNodeId);
        const elementIds = smNode.getChildrenIds();
        const sm = { places:{}, transitions:{}, events:{}};
        const fireables = {};
        
        elementIds.forEach(elementId => {
            console.log('elementId', elementId)
            const node = self._client.getNode(elementId);
            console.log('node', node)
            
            if (node.isTypeOf(META['Place'])){
                const place = { transitions:{}, name: node.getAttribute('name'), position: node.getRegistry('position'), tokens: node.getAttribute('tokens')};
                elementIds.forEach(nextId => {
                    const nextNode = self._client.getNode(nextId);
                    if(nextNode.isTypeOf(META['Arc']) && nextNode.getPointerId('src') === elementId) {
                        place.transitions[nextNode.getPointerId('dst')] = nextNode.getPointerId('dst');
                    }
                });
                sm.places[elementId] = place;
                console.log('place', place)
            }

            if (node.isTypeOf(META['Transition'])){
                const transition = {places:{}, name: node.getAttribute('name'), position: node.getRegistry('position'), fireable: true};
                elementIds.forEach(nextId => {
                    const nextNode = self._client.getNode(nextId);
                    if(nextNode.isTypeOf(META['Arc']) && nextNode.getPointerId('src') === elementId) {
                        transition.places[nextNode.getPointerId('dst')] = nextNode.getPointerId('dst');
                    }
                });
                sm.transitions[elementId] = transition;
            }
        
        });

        Object.keys(sm.places).forEach( placeId => {
            Object.keys(sm.places[placeId].transitions).forEach( transId => {
                fireables[transId] = transId;
            });
        });
        Object.keys(sm.transitions).forEach( transId => {
            if (!(transId in fireables)){
                sm.transitions[transId].fireable = false;
            }
        });
        Object.keys(sm.places).forEach( placeId => {
            if (sm.places[placeId].tokens == 0){
                Object.values(sm.places[placeId].transitions).forEach( transId => {
                    sm.transitions[transId].fireable = false;
                });
            }
        });
        Object.keys(sm.transitions).forEach( transId => {
            if (sm.transitions[transId].fireable == true){
                sm.events[transId] = transId;
            }
        });

        sm.events = this.setFireableEvents;

        // send collected petriProps to widget
        self._widget.initNetwork(sm);
    };

    PetriNetVizControl.prototype.setFireableEvents = function (events) {
        this._fireableEvents = events;

        console.log(events);
        if (events && Object.keys(events).length > 1) {
            // we need to fill the dropdow button with options
            this.$btnEventSelector.clear();
            Object.keys(events).forEach(event => {
                this.$btnEventSelector.addButton({
                    text: event,
                    title: 'fire event: '+ event,
                    data: {event: event},
                    clickFn: data => {
                        this._widget.fireEvent(data.event);
                    }
                });
            });
        } else if (events && Object.keys(events).length === 0) {
            this._fireableEvents = null;
        }
        this._displayToolbarItems();
    };

    PetriNetVizControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    PetriNetVizControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    PetriNetVizControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    PetriNetVizControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {suppressVisualizerFromNode: true});
        }
    };

    PetriNetVizControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    PetriNetVizControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    PetriNetVizControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    PetriNetVizControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    PetriNetVizControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        this.$btnModelHierarchyUp = toolBar.addButton({
            title: 'Go to parent',
            icon: 'glyphicon glyphicon-circle-arrow-up',
            clickFn: function (/*data*/) {
                WebGMEGlobal.State.registerActiveObject(self._currentNodeParentId);
            }
        });
        this._toolbarItems.push(this.$btnModelHierarchyUp);
        this.$btnModelHierarchyUp.hide();

        /************** Checkbox example *******************/

        this.$cbShowConnection = toolBar.addCheckBox({
            title: 'toggle checkbox',
            icon: 'gme icon-gme_diagonal-arrow',
            checkChangedFn: function (data, checked) {
                self._logger.debug('Checkbox has been clicked!');
            }
        });
        this._toolbarItems.push(this.$cbShowConnection);

        this._toolbarInitialized = true;
    };

    return PetriNetVizControl;
});
