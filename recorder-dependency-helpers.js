var canReflect = require("can-reflect");

// Helpers
function removeEdge(event) {
    canReflect.offKeyValue(this.observable, event, this.onDependencyChange,"notify");
}
function removeEdges(oldEventSet, observable){
    oldEventSet.forEach(removeEdge, {onDependencyChange: this.onDependencyChange, observable: observable});
}
function addEdgeIfNotInOldSet(event) {
    // if we haven't already bound this
    if(!this.oldEventSet || !this.oldEventSet["delete"](event)) {
        canReflect.onKeyValue(this.observable, event, this.onDependencyChange,"notify");
    }
}
function addEdges(eventSet, observable){
    eventSet.forEach(addEdgeIfNotInOldSet, {
        onDependencyChange: this.onDependencyChange,
        observable: observable,
        oldEventSet: this.oldDependencies.keyDependencies.get(observable)
    });
}
function addValueDependencies(observable) {
    if(!this.oldDependencies.valueDependencies.delete(observable)) {
        canReflect.onValue(observable, this.onDependencyChange,"notify");
    }
}
function removeValueDependencies(observable) {
    canReflect.offValue(observable, this.onDependencyChange,"notify");
}



module.exports = {
    // a helper that can update
    // observationData -> {newDependencies, oldDependencies, onDependencyChange}
    updateObservations: function(observationData){
        observationData.newDependencies.keyDependencies.forEach(addEdges, observationData);
        observationData.oldDependencies.keyDependencies.forEach(removeEdges, observationData);
        observationData.newDependencies.valueDependencies.forEach(addValueDependencies, observationData);
        observationData.oldDependencies.valueDependencies.forEach(removeValueDependencies, observationData);
    },
    stopObserving: function(observationReciever, onDependencyChange){
        observationReciever.keyDependencies.forEach(removeEdges, {onDependencyChange: onDependencyChange});
        observationReciever.valueDependencies.forEach(removeValueDependencies, {onDependencyChange: onDependencyChange});
    }
};
