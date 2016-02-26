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
  
  this.reachPoint = 0;
  this.reachThread = 0;
}

Backtrack.prototype = {
  getContainer: function Waterfall_getContainer() {
    return this.container;
  },
  
  setPickButton: function Waterfall_setPickButton(pick) {
    this.pickButton = pick;
    
    var pickReachType;
    var pickReachMarker;

    pickReachType = function() {
      var reachTypes = this._getReachTypes();
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var reach of reachTypes) {
        var opt = createElement("option", {});
        opt.appendChild(document.createTextNode(reach));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickReachMarker.bind(this)(typeSelector.value);
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    };
    
    pickReachMarker = function(type) {
      var reachMarkers = this._getReachMarkers(type);
      var selectorContent = createElement("div", {
        className: "backtrackPickerContainer"
      });
      var backButton = createElement("input", {
        type: "button", value: "< Back"
      });
      var typeSelector = createElement("select", {
        size: 30,
      });
      for (var reach_id = 0; reach_id < reachMarkers.length; ++reach_id) {
        var reach = reachMarkers[reach_id].marker;
        var opt = createElement("option", {
          value: reach_id
        });
        opt.appendChild(document.createTextNode(reach.i));
        typeSelector.appendChild(opt);
      }
      backButton.onclick = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        pickReachType.bind(this)();
      }
      typeSelector.onchange = () => {
        selectorContent.parentNode.removeChild(selectorContent);
        this.reachPoint = reachMarkers[typeSelector.value].marker_id;
        this.reachThread = reachMarkers[typeSelector.value].thread_id;
        this.display();
      }
      selectorContent.appendChild(backButton);
      selectorContent.appendChild(typeSelector);
      document.body.appendChild(selectorContent);
    }
    
    this.pickButton.onclick = pickReachType.bind(this);
  },
  
  _isMarkerInBoundary: function(marker) {
    return (marker.time >= this.data.boundaries.min) &&
           (marker.time <= this.data.boundaries.max);
  },
  
  _getReachTypes: function() {
    var result = [];

    if (!this.backtrack) {
      return result;
    }
    
    var set = {};
    for (var thread_id in this.backtrack) {
      var thread = this.backtrack[thread_id];
      for (var marker of thread) {
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "r") {
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

  _getReachMarkers: function(type) {
    var result = [];

    if (!this.backtrack) {
      return result;
    }
    
    for (var thread_id in this.backtrack) {
      var thread = this.backtrack[thread_id];
      for (var marker_id in thread) {
        var marker = thread[marker_id];
        if (!this._isMarkerInBoundary(marker)) {
          continue;
        }
        if (marker.t === "r" && marker.w === type) {
          result.push({
            time: marker.time, 
            marker: marker,
            marker_id: marker_id, 
            thread_id: thread_id
          });
        }
      }
    }
    result.sort(function(a, b) {
      if (a.time == b.time) return 0;
      return (a.time > b.time) ? 1 : -1;
    });
    return result;
  },

  assignData: function Backtrack_assignData(data) {
    this.data = data;
    this.backtrack = data.backtrack;
    
    if (this.reachPoint) {
      this.display();
    }
  },
  
  display: function Backtrack_display() {
    this.container.innerHTML = "";
    
    var range = this.data.boundaries.max - this.data.boundaries.min;
    
    var thread_id = this.reachThread;
    var thread = this.backtrack[thread_id];
    var marker_id = this.reachPoint;
    var marker = thread[marker_id];

    var status = "CPU_on_path";
    var status_end = marker.time;
    
    var updateStatus = function(begin, nextStatus)
    {
      var startX = (begin - this.data.boundaries.min) * 100.0 / range;
      var stopX = (status_end - this.data.boundaries.min) * 100.0 / range;
      
      var block = createElement("div", {
        className: "backtrackTape backtrackType-" + status,
        style: {
          left: startX + "%",
          width: (stopX - startX < 0.5) ? "1px" : (stopX - startX) + "%",
        }
      });

      var end = status_end;
      block.onclick = () => {
        alert(begin + ":" + end + " = " + (marker.w || "(no data)"));
      }
      this.container.appendChild(block);
      
      status = nextStatus;
      status_end = begin;
    }.bind(this);
    
    var find = function(gid, type)
    {
      // TODO optimize!!!
      for (var _thread_id in this.backtrack) {
        var _thread = this.backtrack[_thread_id];
        for (var _marker_id in _thread) {
          var _marker = _thread[_marker_id];
          if (_marker.i == gid && _marker.t == type) {
            thread_id = _thread_id;
            thread = _thread;
            marker_id = _marker_id;
            marker = _marker;            
            return true;
          }
        }
      }
      
      return false;
    }.bind(this);
    
    while (marker.time > this.data.boundaries.min) {
      switch (marker.t) {
        case "d": // dequeue
          updateStatus(marker.time, "");
          if (!find(marker.i, "q")) {
            alert("Queue/dispatch marker not found");
            return;
          }
          continue;
        case "q": // queue
          switch (marker.w) {
            case "run": status = "dispatch_runnable"; break;
            case "ipc": status = "dispatch_ipc"; break;
            case "ipco": status = "dispatch_ipc_overhead"; break;
            case "timer": status = "dispatch_timer"; break;
            case "net": status = "network"; break;
            case "gen": status = "dispatch_gen"; break;
          }
          updateStatus(marker.time, "CPU_on_path");
          break;
      } // switch
      
      --marker_id;
      marker = thread[marker_id];
    } // while (in range)
  }
};
