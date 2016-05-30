// Test profile: e74815d8695ccf8580d4af3be5cd1371f202f6ae
// 1305aa31f417005934020cd7181d8331691945d1

function createElement(name, props, fill) {
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

  if (fill) {
    fill(el);
  }
  return el;
}

function Backtrack()
{
  this.container = createElement("div", {
    className: "histogram",
  });

  this.tabContainer = createElement("div", {
    className: "backtrackTab",
  });

  this.data = null;
  this.pickButton = null;
  this.histogramView = null;

  this.objectiveMarker = null;
  this.objectiveThread = null;
  this.originalObjectiveMarker = null;
  this.originalObjectiveThread = null;
  this.follow_thread = false;
  this.down_to_limit = 0;
  this.dont_follow = [];
  
  this.history = [];

  this.tapePutBackzIndex = 0;
}

Backtrack.prototype = {
  round: function(ms) {
    return Math.round(ms * 10) / 10.0;
  },

  clock_time: function(ms) {
    var tick_diff_us = (this.data.timing.tick - ms) * 1000;
    var clock_us = this.data.timing.clock - tick_diff_us;
    return (new Date(clock_us / 1000)).toLocaleString();
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
        this.originalObjectiveMarker = this.objectiveMarker;
        this.originalObjectiveThread = this.objectiveThread;
        this.history = [];
        
        this.record = null;
        this.display(true /* prescan */);
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

  assignData: function Backtrack_assignData(histogramView, data) {
    this.data = data;
    this.histogramView = histogramView;

    // todo - this.objectiveMarkerId needs reset on new data
    if (this.objectiveMarker) {
      this.display();
    }
  },
  
  subtrack: function Backtrack_subtrack(thread, marker, limit, follow_thread, dont_follow_thread_and_marker) {
    this.history.push([this.objectiveThread, this.objectiveMarker, this.follow_thread, this.down_to_limit, this.dont_follow]);
    this.objectiveThread = thread;
    this.objectiveMarker = marker;
    this.follow_thread = follow_thread;
    this.down_to_limit = limit;
    if (dont_follow_thread_and_marker) {
      this.dont_follow = this.dont_follow.concat([dont_follow_thread_and_marker]);
    }
    this.display();
  },
  
  unsubtrack: function() {
    if (!this.history.length) {
      alert("Nothing in history");
    }
    [this.objectiveThread, this.objectiveMarker, this.follow_thread, this.down_to_limit, this.dont_follow] = this.history.pop();
    this.display();
  },

  display: function Backtrack_display(prescan) {
    prescan = prescan || false;
    console.log("backtrack.draw begin, prescan=" + prescan);
    
    var stats = {
      capturing: false,
      CPU_on_path: 0,
      CPU_blocking: 0,
      CPU_related: 0,
      IO: 0,
      lock_wait: 0,
      runnable_wait: 0,
      sleep: 0,
      IPC: 0,
      network: 0,
      general_queues: 0,
      threads: {}
    };

    var thread_stat = function(thread, stats) {
      if (!(thread.tid in stats.threads) || !stats.capturing) {
        var t = {
          name: thread.name,
          utilization: 0,
          blocking: 0,
          runwait: 0,
          sleep: 0,
          IO: 0,
          lock_wait: 0
        };
        if (!stats.capturing) {
          return t;
        }
        stats.threads[thread.tid] = t;
      }
      return stats.threads[thread.tid];
    };

    var range = this.data.boundaries.max - this.data.boundaries.min;
    range = Math.max(1, range);
    var one_pixel = 100 / this.container.clientWidth;

    var caret = {};
    caret.stats = stats;
    caret.thread = this.objectiveThread;
    caret.marker = this.objectiveMarker;
    caret.closing = caret.marker;
    caret.closing_thread = caret.thread;
    caret.cpu_state = 1;
    caret.clone = function () {
      var copy = {};
      for (p in this) {
        copy[p] = this[p];
      }
      return copy;
    }

    function parse_what(what)
    {
      if (!what) {
        return { name: "", params: [] };
      }
      var match = what.match(/^([^\[]*)(?:\[(.*)\])?$/);
      return { name: match[1], params: match[2] ? match[2].split(",") : [] };
    }

    function logstr_caret(caret)
    {
      return JSON.stringify(caret.marker) + "@" + JSON.stringify([caret.thread.name,caret.thread.tid]);
    }

    var move_cursor_to = function(gid, caret)
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

    var fill_interval_data_element = function(caret, block)
    {
      var container = this.selectedIntervalContainer;
      container.innerHTML = "";

      var what = parse_what(caret.marker.w);
      var source;
      switch (caret.marker.t) {
        case "q": source = "Pending"; break;
        case "d": source = "Execute"; break;
        default:  source = "[marker type: " + caret.marker.t + "]"; break;
      }
      container.appendChild(createElement("div", {}, (e) => {
        e.textContent = source + " " + what.name + " [" + what.params.join(",") + "]";
      }));

      var duration = caret.closing.time - caret.marker.time;
      duration = this.round(duration);
      container.appendChild(createElement("div", {}, (e) => {
        e.textContent = duration + "ms";
      }));

      var detail = parse_what(caret.marker.d);
      var type = detail.name.split("/");
      var padding = 0;
      for (var level of type) {
        container.appendChild(createElement("div", {style: {paddingLeft: padding + "em"}}, (e) => {
          e.textContent = level;
        }));
        ++padding;
      }
      for (var param of detail.params) {
        var [key, value] = param.split("=", 2);
        container.appendChild(createElement("div", {}, (e) => {
          e.textContent = key + ": " + value;
        }));
      }

      var found_thread;
      this.histogramView.eachThread(function(thread, threadId) {
        if (thread.tid == caret.closing_thread.tid) {
          found_thread = thread;
        }
      });

      container.appendChild(createElement("div", {}, (e) => {
        if (caret.thread.tid != caret.closing_thread.tid) {
          e.textContent += caret.thread.name + " (" + caret.thread.tid + ") \u2192 ";
        }
        e.textContent += caret.closing_thread.name + " (" + caret.closing_thread.tid + ")";
        if (!found_thread) {
          e.textContent += " (profiler data N/A)";
        }
      }));


      container.appendChild(createElement("br", {}));

      container.appendChild(createElement("button", {}, (e) => {
        e.onclick = () => {
          block.style.zIndex = (--this.tapePutBackzIndex) + "";
        }
        e.textContent = "Push back";
      }));

      if (what.params.includes("control") || this.follow_thread || caret.closing.t == "e") {
        container.appendChild(createElement("button", {}, (e) => {
          e.onclick = () => {
            this.subtrack(caret.closing_thread, caret.closing, 0, false);
          }
          e.textContent = "Follow";
        }));
      }
      
      if (caret.closing.t == "d") {
        container.appendChild(createElement("button", {}, (e) => {
          e.onclick = () => {
            this.subtrack(this.objectiveThread, this.objectiveMarker, 0, false, [caret.closing_thread, caret.closing]);
          }
          e.textContent = "Don't follow";
        }));
      }
      
      if (caret.marker.t == "q" && what.name == "run") {
        container.appendChild(createElement("button", {}, (e) => {
          e.onclick = () => {
            var subcaret = {};
            move_cursor_to([caret.closing_thread.tid, caret.closing.i], subcaret);
            this.subtrack(subcaret.thread, subcaret.marker, caret.marker.time, true);
          }
          e.textContent = "Reveal blocking runnables";
        }));
      }
    }.bind(this);

    var backdraw_and_shift = function(caret, name, add_class_names)
    {
      if (caret.marker == caret.closing) {
        return;
      }
      
      caret.stats.capturing = this._isMarkerInBoundary(caret.marker) ||
                              this._isMarkerInBoundary(caret.closing);
      var startX = (caret.marker.time - this.data.boundaries.min) * 100.0 / range;
      var stopX = (caret.closing.time - this.data.boundaries.min) * 100.0 / range;

      var block = createElement("div", {
        className: "backtrackTape backtrackType-" + name + (add_class_names ? (" " + add_class_names) : ""),
        style: {
          left: startX + "%",
          width: ((stopX - startX) < one_pixel) ? "1px" : ((stopX - startX) + "%")
        }
      });

      var begin_time = this.clock_time(caret.marker.time);
      var begin_thread = caret.thread.name;
      var duration = this.round(caret.closing.time - caret.marker.time);
      var end_thread = caret.closing_thread.name;
      var what = caret.marker.w;
      var details = caret.marker.d;
      block.setAttribute("title",
        begin_time + " @ " + begin_thread + "\n+" +
        duration + "ms @ " + end_thread + "\n\n" +
        (what || "") + (details ? " - " + details : "")) ;

      var caret_clone = caret.clone();
      block.addEventListener("click", function() {
        fill_interval_data_element(caret_clone, block);
      }.bind(this));

      this.container.appendChild(block);

      var cduration =
        Math.min(caret.closing.time, this.data.boundaries.max) -
        Math.max(caret.marker.time, this.data.boundaries.min);

      // update stats for the tab
      if (caret.stats.capturing && (!add_class_names || !add_class_names.split(' ').includes("control"))) {
        switch (name) {
        case "CPU_on_path":
          caret.stats.CPU_on_path += cduration;
          thread_stat(caret.thread, caret.stats).utilization += cduration;
          break;
        case "dispatch-lock-wait":
          caret.stats.lock_wait += cduration;
          thread_stat(caret.thread, caret.stats).lock_wait += cduration;
          break;
        case "dispatch-io":
          caret.stats.IO += cduration;
          thread_stat(caret.thread, caret.stats).IO += cduration;
          break;
        case "dispatch-run":
          caret.stats.runnable_wait += cduration;
          thread_stat(caret.thread, caret.stats).runwait += cduration;
          break;
        case "dispatch-ipc":
          caret.stats.IPC += cduration;
          break;
        case "dispatch-net":
          caret.stats.network += cduration;
          break;
        case "dispatch-queue":
          caret.stats.general_queues += cduration;
          break;
        case "dispatch-idle":
          caret.stats.sleep += cduration;
          thread_stat(caret.thread, caret.stats).sleep += cduration;
          break;
        }
      }

      console.log("  backdraw_and_shift: " + logstr_caret(caret) + " type=" + name + " X=" + startX);

      caret.closing = caret.marker;
      caret.closing_thread = caret.thread;
    }.bind(this);

    var draw_input = function(caret)
    {
      var startX = (caret.marker.time - this.data.boundaries.min) * 100.0 / range;

      var block = createElement("div", {
        className: "backtrackInput",
        style: {
          right: (100 - startX) + "%"
        }
      });

      block.textContent = caret.marker.w + "\n" +
                          caret.marker.d + "\n@" +
                          this.clock_time(caret.marker.time);

      this.container.appendChild(block);
    }.bind(this);

    var found_input = false;
    
    if (prescan) { // this really is a hack :)
    
      var nested_execs = [];
      
      var record = {
        unmarked: 0,
        critical: 1,
        related: 2,
        
        add: function(marker, thread, level) {
          var thread = thread.tid;
          if (!(thread in this)) {
            this[thread] = {};
          }
          thread = this[thread];
          thread[marker.i] = level;
        },
        
        level: function(marker, thread) {
          var thread = thread.tid;
          if (!(thread in this)) {
            return this.unmarked;
          }
          thread = this[thread];
          return thread[marker.i] || this.unmarked;
        }
      };
      
      var complex_hits = [];
      
      // mark critical
      scan: while (!found_input) {     
        
        record.add(caret.marker, caret.thread, record.critical);
        
        switch (caret.marker.t) {
          case "d": // dequeue (execution start)
            if (nested_execs.length && nested_execs[0].marker == caret.marker) {
              nested_execs.shift();
              break;
            }

            var revert = caret.clone();

            if (!move_cursor_to(caret.marker.o, caret)) {
              console.log("Queue/dispatch marker not found " + JSON.stringify(caret));
              return;
            }

            var what = parse_what(caret.marker.w);
            if (what.params.includes("control")) {
              caret = revert;
            } else {
              record.add(caret.marker, caret.thread, record.critical); 
            }

            break;

          case "e": // end of execution
            var exec_start = caret.clone();
            if (!move_cursor_to(caret.marker.o, exec_start)) {
              console.log("Execution span start not found " + JSON.stringify(caret.marker));
              return;
            }
            nested_execs.unshift(exec_start);
            break;
            
          case "i": // input
            found_input = true;
            break scan;
            
          case "h": // hit complex point
            complex_hits.push(caret.clone());
            break;
        }  

        if (!move_cursor_to([caret.thread.tid, caret.marker.i - 1], caret)) {
          console.log("Hit start of the thread?");
          break;
        }
      }
      
      // mark related
      while (complex_hits.length) {
        caret = complex_hits.shift();
        previous = caret.clone();
        if (!move_cursor_to(caret.marker.o, previous)) {
          console.log("Previous complex hit marker not found " + JSON.stringify(caret));
          return;
        }
        if (previous.marker.t == "h" &&
            complex_hits.find((cursor) => { 
              return cursor.marker.i == previous.marker.i && cursor.thread.tid == previous.thread.tid 
            }) == undefined) {
          complex_hits.push(previous);
        }
        
        found_input = false;
        related_scan: while (!found_input) {
          if (!move_cursor_to([caret.thread.tid, caret.marker.i - 1], caret)) {
            console.log("Hit start of the thread?");
            break;
          }
        
          if (record.level(caret.marker, caret.thread) > record.unmarked) {
            // We are back on the road...
            break related_scan;
          }
          
          record.add(caret.marker, caret.thread, record.related); 
          
          switch (caret.marker.t) {
            case "d": // dequeue (execution start)
              if (nested_execs.length && nested_execs[0].marker == caret.marker) {
                nested_execs.shift();
                break;
              }

              var revert = caret.clone();

              if (!move_cursor_to(caret.marker.o, caret)) {
                console.log("Queue/dispatch marker not found " + JSON.stringify(caret));
                return;
              }

              var what = parse_what(caret.marker.w);
              if (what.params.includes("control")) {
                caret = revert;
              } else {
                record.add(caret.marker, caret.thread, record.related); 
              }

              break;

            case "e": // end of execution
              var exec_start = caret.clone();
              if (!move_cursor_to(caret.marker.o, exec_start)) {
                console.log("Execution span start not found " + JSON.stringify(caret.marker));
                return;
              }
              nested_execs.unshift(exec_start);
              break;
              
            case "i": // input
              found_input = true;
              break related_scan;
              
            case "h": // hit complex point
              complex_hits.push(caret.clone());
              break;
          }  
        }
      }
      
      this.record = record;
      // end of prescan

    } else {
    
      // DRAWING
      var is_first_marker = true;
      var on_idle_poll_jump = null;
      
      this.container.innerHTML = "";
      this.tabContainer.innerHTML = "";
      this.tapePutBackzIndex = 100;

      this.tabContainer.appendChild(createElement("div", { className: "group" }, (e) => {
        if (this.history.length > 0) {
          e.appendChild(createElement("button", {}, (e) => {
            e.onclick = () => {
              this.unsubtrack();
            }
            e.textContent = "< Back";
          }));
        }
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Objective: " + this.originalObjectiveMarker.w;
        }));
        e.appendChild(createElement("div", {style: {color: "RoyalBlue"} }, (e) => {
          e.textContent = this.originalObjectiveMarker.d;
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = this.originalObjectiveThread.name + ", " + this.clock_time(this.originalObjectiveMarker.time);
        }));
      }));

      main: while (!found_input && (caret.marker.time >= this.data.boundaries.min) && 
                                  (caret.marker.time >= this.down_to_limit)) {
        console.log("Backtrack loop on: " + JSON.stringify(caret.marker));
        switch (caret.marker.t) {
          case "d": // dequeue
            backdraw_and_shift(caret, "CPU_on_path");

            if (this.dont_follow.findIndex((dont_follow) => {
                  return (caret.marker.i == dont_follow[1].i && 
                          caret.thread.tid == dont_follow[0].tid);
                }) > -1) {
              console.log("    marker manually set to not be followed");
              break;
            }
          
            var revert = caret.clone();

            if (!move_cursor_to(caret.marker.o, caret)) {
              console.log("Queue/dispatch marker not found " + JSON.stringify(caret));
              return;
            }

            var what = parse_what(caret.marker.w);

            // special case the network dequeue: go down to idle[poll] end and then jump
            if (what.name == "net" && !on_idle_poll_jump) {
              console.log("    remembering this marker to follow after idle[poll] hit: " + JSON.stringify(caret.marker));
              on_idle_poll_jump = revert.clone();
              caret = revert;
              break;
            }
            
            if (what.name == "idle" && what.params.includes("poll") && on_idle_poll_jump) {
              caret = on_idle_poll_jump;
              move_cursor_to(caret.marker.o, caret);
              what = parse_what(caret.marker.w);
              on_idle_poll_jump = null;
              console.log("    hit idle[poll], returning to " + JSON.stringify(caret.marker));
            }

            if (on_idle_poll_jump) {
              console.log("    don't follow, we scan for idle[poll]: " + JSON.stringify(caret.marker));
              caret = revert;
              break;
            }
            
            if ((what.params.includes("control") && !is_first_marker) || this.follow_thread) {
              // Ignore control dispatches
              // TODO: rework this to not split current CPU_on_path
              backdraw_and_shift(caret, "dispatch-" + what.name, "control");
              caret = revert;
              break;
            }

            backdraw_and_shift(caret, "dispatch-" + what.name);
            
            break;

          case "e": // end of execution
            if (is_first_marker && !this.follow_thread) {
              // is_first_marker - when tracking a particular runnable, we start from e, but want it as CPU-path
              // and do this only when we are normally fully backtracking and not just following the thread (in
              // case of showing blocking runnables, for instance) 
              break;
            }
            
            backdraw_and_shift(caret, "CPU_on_path");

            if (!move_cursor_to(caret.marker.o, caret)) {
              console.log("Execution span start not found " + JSON.stringify(caret.marker));
              return;
            }
            
            if (this.follow_thread) {
              var level = this.record.level(caret.marker, caret.thread);
              switch (level) {
                case this.record.unmarked: level = "CPU_blocking"; break;
                case this.record.critical: level = "CPU_critical"; break;
                case this.record.related: level = "CPU_related"; break;
              }
              backdraw_and_shift(caret, level);
            } else {
              backdraw_and_shift(caret, "CPU_on_path_nested");
            }
            

            break;

          case "i": // user input
            if (this.follow_thread) {
              // Don't show (or at least definitely don't stop on) input when following thread
              break;
            }
            backdraw_and_shift(caret, "CPU_on_path");
            draw_input(caret);
            console.log("backtrack.draw finished on user input");
            found_input = true;
            break;
            
          case "h": // hit a complex path
            
            break;
        }

        do {
          if (!move_cursor_to([caret.thread.tid, caret.marker.i - 1], caret)) {
            console.log("Hit start of the thread?");
            break main;
          }
        } while (!(["d","e","i"].includes(caret.marker.t)));
        
        is_first_marker = false;
      } // while (in range)

      // Probably needs some conditioning.. lazy to figure this out now
      if (!found_input) {
        backdraw_and_shift(caret, "CPU_on_path");
      }

      console.log("backtrack.draw done");

      var overall_time =
        Math.min(this.objectiveMarker.time, this.data.boundaries.max) -
        Math.max(caret.marker.time, this.data.boundaries.min);

      var timing_stat_string = function(time)
      {
        return this.round(time) + "ms (" + this.round((time / overall_time) * 100) + "%)";
      }.bind(this);

      this.tabContainer.appendChild(createElement("div", { className: "group" }, (e) => {
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Selected element data";
        }));
        e.appendChild(createElement("div", {}, (e) => {
          this.selectedIntervalContainer = e;
          e.textContent = "Click into the Backtrack view to pick an interval tape";
        }));
      }));


      this.tabContainer.appendChild(createElement("div", { className: "group" }, (e) => {
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Statistics";
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Overall time: " + this.round(overall_time) + "ms";
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "CPU utilization (on path): " + timing_stat_string(stats.CPU_on_path);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "CPU utilization (related): " + timing_stat_string(stats.CPU_related);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "CPU utilization (blocking): " + timing_stat_string(stats.CPU_blocking);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Dispatch wait: " + timing_stat_string(stats.runnable_wait);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Lock wait: " + timing_stat_string(stats.lock_wait);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Sleep wait: " + timing_stat_string(stats.sleep);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "I/O: " + timing_stat_string(stats.IO);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "IPC on wire: " + timing_stat_string(stats.IPC);
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Network: " + timing_stat_string(stats.network);
          e.appendChild(createElement("a", { href: "#" }, (e) => {
            e.textContent = "Details";
            e.onclick = () => this.expandNetworkingDetails(stats);
          }));
        }));
        e.appendChild(createElement("div", {}, (e) => {
          e.textContent = "Queuing: " + timing_stat_string(stats.general_queues);
        }));
      }));
    } // drawing
  },

  getTabContainer: function Backtrack_getTabContainer() {
    return this.tabContainer;
  },

  expandNetworkingDetails: function Backtrack_expandNetworkingDetails(stats) {
    alert(stats.network);
    /// ?
  }
};
