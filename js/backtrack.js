// Test profile: e74815d8695ccf8580d4af3be5cd1371f202f6ae
// 1305aa31f417005934020cd7181d8331691945d1

function createElement(name, props) {
  var el = document.createElement(name);

  for (var key in props) {
    if (key === "style") {
      for (var styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el[key] = props[key];
    }
  }

  return el;
}

function Backtrack(data)
{
  this.container = createElement("div", {
    className: "histogram",
  });
  this.data = null;
  this.pickButton = null;

  this.objectiveMarker;
  this.objectiveThread;
}

Backtrack.prototype = {
  round: function(ms) {
    return Math.round(ms * 10) / 10.0;
  },
  
  getContainer: function Backtrack_getContainer() {
    return this.container;
  },

  setPickButton: function Backtrack_setPickButton(pick) {
    this.pickButton = pick;

    var pickObjectivesType;
    var pickObjectivesMarker;

    pickObjectivesType = function() {
      var objectiveTypes = this._getObjectivesTypes();
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var Objectives of objectiveTypes) {
        var opt = createElement("option", {});
        opt.appendChild(document.createTextNode(Objectives));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickObjectivesMarker.bind(this)(typeSelector.value);
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    };

    pickObjectivesMarker = function(type) {
      var objectiveMarkers = this._getObjectivesMarkers(type);
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var objective_id = 0; objective_id < objectiveMarkers.length; ++objective_id) {
        var Objectives = objectiveMarkers[objective_id].marker;
        var opt = createElement("option", {
          value: objective_id
        });
        opt.appendChild(document.createTextNode(Objectives.d));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickObjectivesType.bind(this)();
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        this.objectiveMarker = objectiveMarkers[typeSelector.value].marker;
        this.objectiveThread = objectiveMarkers[typeSelector.value].thread;
        this.display();
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    }

    this.pickButton.onclick = pickObjectivesType.bind(this);
  },

  _isMarkerInBoundary: function(marker) {
    return (marker.time >= this.data.boundaries.min) &&
           (marker.time <= this.data.boundaries.max);
  },

  _getObjectivesTypes: function() {
    var result = [];

    if (!this.data.threads) {
      return result;
    }

    var set = {};
    for (var thread_id in this.data.threads) {
      var thread = this.data.threads[thread_id];
      for (var marker of thread.markers) {
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "o") {
          set[marker.w] = true;
        }
      }
    }
    for (what in set) {
      result.push(what);
    }
    result.sort();
    return result;
  },

  _getObjectivesMarkers: function(type) {
    var result = [];

    if (!this.data) {
      return result;
    }

    for (var thread_id in this.data.threads) {
      var thread = this.data.threads[thread_id];
      for (var marker_id in thread.markers) {
        var marker = thread.markers[marker_id];
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "o" && marker.w === type) {
          result.push({
            thread: thread,
            marker: marker
          });
        }
      }
    }
    result.sort(function(a, b) {
      if (a.marker.time == b.marker.time) return 0;
      return (a.marker.time > b.marker.time) ? 1 : -1;
    });
    return result;
  },

  assignData: function Backtrack_assignData(data) {
    this.data = data;

    // todo - this.objectiveMarkerId needs reset on new data
    if (this.objectiveMarker) {
      this.display();
    }
  },

  display: function Backtrack_display() {
    this.container.innerHTML = "";

    var range = this.data.boundaries.max - this.data.boundaries.min;
    var one_pixel = 100 / this.container.clientWidth;

    var caret = {};
    caret.thread = this.objectiveThread;
    caret.marker = this.objectiveMarker;
    caret.closing = caret.marker;
    caret.closing_thread = caret.thread;
    
    var backdraw = function(caret, name)
    {
      var startX = (caret.marker.time - this.data.boundaries.min) * 100.0 / range;
      var stopX = (caret.closing.time - this.data.boundaries.min) * 100.0 / range;

      var block = createElement("div", {
        className: "backtrackTape backtrackType-" + name,
        style: {
          left: startX + "%",
          width: ((stopX - startX) < one_pixel) ? "1px" : ((stopX - startX) + "%")
        }
      });

      var begin_time = this.round(caret.marker.time);
      var begin_thread = caret.thread.name;
      var duration = this.round(caret.closing.time - caret.marker.time);
      var end_thread = caret.closing_thread.name;
      var what = caret.marker.w;
      var details = caret.marker.d;
      block.setAttribute("title", 
        begin_time + "ms@" + begin_thread + "\n+" + 
        duration + "ms@" + end_thread + "\n" + 
        (what || "") + (details ? " / " + details : "")) ;
      this.container.appendChild(block);
      
      caret.closing = caret.marker;
      caret.closing_thread = caret.thread;
    }.bind(this);

    var find = function(gid, caret)
    {
      if (gid[1] == 0) {
        console.log("gid.id == 0");
        return false;
      }
      
      caret.thread = this.data.threads[gid[0]];
      if (!caret.thread) {
        console.log("thread for gid.tid=" + gid[0] + " not found");
        return false;
      }
      
      caret.marker = caret.thread.markers[gid[1] - 1];
      return (caret.marker.i == gid[1]);
    }.bind(this);

    while (caret.marker.time > this.data.boundaries.min) {

      switch (caret.marker.t) {
        case "d": // dequeue
          backdraw(caret, "CPU_on_path");
          if (!find(caret.marker.o, caret) ) {
            console.log("Queue/dispatch marker not found " + JSON.stringify(caret));
            return;
          }
          backdraw(caret, "dispatch_" + caret.marker.w);
          break;
      }

      if (!find([caret.thread.tid, caret.marker.i - 1], caret)) {
        console.log("Hit start of the thread");
        break;
      }
    } // while (in range)
  }
};
