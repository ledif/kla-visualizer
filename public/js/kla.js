sigma.utils.pkg('sigma.canvas.nodes');

var ANIMATIONS_TIME = 50,
    SRC_NODE = 0,
    FRAMES_TO_FREEZE_PER_LEVEL = 5,
    DEGREE_OF_PARALLISM = 3,
    REVISIT_PROBABILITY = 0.01,
    GRAPH_FILE = 'graphs/rgg.json'
    K = 1


var totalNumLevels = 0,
    framesToFreezeForFlash = 0


// global sigma instance
var s;

function loadGraph() {
  sigma.parsers.json(GRAPH_FILE, 
  {
      renderer: {
        container: document.getElementById('graph-container'),
        type: 'canvas'
      },
      settings: {
        animationsTime: ANIMATIONS_TIME
      }
    }, 
    function(sig) {
      s = sig
      initializeSigma(s)
    }
  );
}

loadGraph();

var animationCallback;
function initializeSigma(s)
{ 
  s.graph.nodes().forEach(function(node) {
    node.level = 9999999;
    node.size = 1
    node.color = "#000000"
    node.active = false;
    node.touched = false;
    node.type = ""
    node.star = {}
  })

  CustomShapes.init(s);

  s.graph.nodes()[SRC_NODE].level = 0;
  s.graph.nodes()[SRC_NODE].active = true;
  s.graph.nodes()[SRC_NODE].color = "#ff00ff";

  bfs(s)

  $('#k-slider').slider('setAttribute', 'max', totalNumLevels)

  totalNumLevels = Math.floor(totalNumLevels / K);

  s.graph.nodes().forEach(function(node) {
    node.level = Math.floor(node.level / K)
  });


  allNeighbors = populateAllNeighbors(s.graph)

  currentNodes = [s.graph.nodes()[SRC_NODE]];
  canAnimate = true;
  currentLevel = 0;

  animationCallback = setInterval(animateStep, ANIMATIONS_TIME, s);
}

function changeShapeIf(p, node) {
  if (p) {
    node.bfs_color = "#ff0000"
    node.type = "star";
    node.star = {
      innerRatio: 0.2,
      numPoints: 4
    }
  }
}

function animateStep(s)
{
  if (!canAnimate) return;

    // if we're stalling because we want to highlight a level change
    if (framesToFreezeForFlash > 0) {
      flashLevel(s)
      framesToFreezeForFlash--;
    }

    // normal stuff
    else {

      // update the superstep label
      $("#levelCount").html([
        '<span class="label label-primary" style="background-color: ',
        RainBowColor(currentLevel, totalNumLevels),
        '">',
        (currentLevel+1),
        '</span>'
       ].join(" "));

      s.graph.nodes().forEach(function(node) {
        if (node.touched)
          node.bfs_color = "#bbbbbb"

         // if this node is in the current set of nodes
        else if (_.some(currentNodes, function(n) {return n.id == node.id}) ) {
          node.bfs_color = "#ff00ff"
          node.touched = true;
        }
          else
            node.bfs_color = "#000000"

        changeShapeIf(node.retouched, node);

        if (node.retouched) {
          node.retouched = false;
        }
      });

      // choose next nodes
      var clonedCurrentNodes = currentNodes.slice(0);
      currentNodes = []

      for (i = 0; i < clonedCurrentNodes.length; i++) {
        currentNode = clonedCurrentNodes[i];
        ns = allNeighbors[currentNode.id];

        hasNeighbor = false
        
        // try to find a neighbor of a node in the set
        for (var i = 0; i < ns.length; i++) {
          if (s.graph.nodes(ns[i].target).level <= currentLevel && currentNodes.length < DEGREE_OF_PARALLISM) {
            if (s.graph.nodes(ns[i].target).touched && shouldRevisit()) {
              s.graph.nodes(ns[i].target).retouched = true;
              currentNodes.push(s.graph.nodes(ns[i].target))
              hasNeighbor = true
            }
            else if (!s.graph.nodes(ns[i].target).touched) {
              currentNodes.push(s.graph.nodes(ns[i].target))
              hasNeighbor = true
            }
          }
        }

        // choose random node in this level if no neighbor
        if (!hasNeighbor) {
          s.graph.nodes().forEach(function(node) {
            if (node.touched && node.level <= currentLevel) {
              ns2 = allNeighbors[node.id];

              for (i = 0; i < ns2.length; i++) {
                if (!s.graph.nodes(ns2[i].target).touched && s.graph.nodes(ns2[i].target).level == currentLevel && currentNodes.length < DEGREE_OF_PARALLISM)
                  currentNodes.push(s.graph.nodes(ns2[i].target))
              }
            }
          });
        }

      }

      // check if this level is done
      levelDone = true;
      s.graph.nodes().forEach(function(node) {
        if (node.level <= currentLevel && !node.touched )
          levelDone = false
      });

      // if the level is done, flash colors
      if (levelDone) {
        flashLevel(s)

        // increase to next level
        currentLevel++

        // use old nodes to start from
        currentNodes = clonedCurrentNodes

        framesToFreezeForFlash = FRAMES_TO_FREEZE_PER_LEVEL;

        // if we're done with the whole graph, turn off the animation
        if (_.all(s.graph.nodes(), function(n) {return n.touched}))
          canAnimate = false;
      }
    }

    sigma.plugins.animate(
      s,
      {
        color: 'bfs_color'
      }
    );
  }


function populateAllNeighbors(g) {
  allNeighbors = []


  g.nodes().forEach(function(node) {
    allNeighbors[node.id] = []
  });

  g.edges().forEach(function(e) {
    allNeighbors[e.source].push(e)
    allNeighbors[e.target].push({source: e.target, target: e.source})
  })

  return allNeighbors;
}

function shouldRevisit() {
  var x = Math.random();
  return (x < (REVISIT_PROBABILITY*(K-1))/totalNumLevels)
}

// do a bfs
function bfs(s) {

  allNeighbors = populateAllNeighbors(s.graph)


   currentLevel = 0;
   done = false;

   while(!done) {
     s.graph.nodes().forEach(function(node) {

      if (node.level == currentLevel) {
        ns = allNeighbors[node.id]

          // console.log("processing node " + node.id)

        for (var i = 0; i < ns.length; i++) {
           // console.log("neighbor of " + node.id + " is " + ns[i].target)

          if (s.graph.nodes(ns[i].target).level > currentLevel) {
             // console.log("updating " +ns[i].target + " with level " + (currentLevel + 1))

            s.graph.nodes(ns[i].target).level = currentLevel+1;
            // s.graph.nodes(ns[i].target).active = true;

          }
        }
        node.active = true
      }
      else {
        node.active = false;
      }
   });

   done = true;
   s.graph.nodes().forEach(function(node) {
    if (node.active)
      done = false;
   })

   currentLevel++;
  }


   totalNumLevels = currentLevel;
};

function flashLevel(s)
{    s.graph.nodes().forEach(function(node) {
      if (node.touched)
        node.bfs_color = RainBowColor(node.level, totalNumLevels+1)
    });
}

function RainBowColor(length, maxLength)
{
    var i = (length * 255 / maxLength);
    var r = Math.round(Math.sin(0.024 * i + 0) * 127 + 128);
    var g = Math.round(Math.sin(0.024 * i + 2) * 127 + 128);
    var b = Math.round(Math.sin(0.024 * i + 4) * 127 + 128);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}



function replayAnimation()
{
  canAnimate = false;
  window.clearInterval(animationCallback);
  initializeSigma(s)
}


// slider stuff
$('#k-slider').slider().on('slide', function(e) {
  K = e.value
  $("#current-k-value").html(K);

  replayAnimation()
});



$('#pentalty-slider').slider().on('slide', function(e){
  REVISIT_PROBABILITY = e.value/100
  console.log(REVISIT_PROBABILITY);

  replayAnimation()
});

function changeInputGraph(that) {
  s.kill()
  loadGraph();

  that.removeClass('btn-default')
  that.addClass('btn-primary')

  that.siblings('button').removeClass('btn-primary')
  that.siblings('button').addClass('btn-default')
}

// change graph inputs
$('#btn-mesh').click(function(e) {
  GRAPH_FILE = 'graphs/mesh.json'

  changeInputGraph($(this));
});

$('#btn-rgg').click(function(e) {
  GRAPH_FILE = 'graphs/rgg.json'

  changeInputGraph($(this));
});


