const NODE_WIDTH = 20
const NODE_HEIGHT = 30
const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const svg = d3.select('svg')
  .attr('width',WIDTH)
  .attr('height',HEIGHT)
const getPosition = (x,y,angle,distance) => [
  distance*Math.cos(angle*Math.PI/180)+x,
  y-distance*Math.sin(angle*Math.PI/180)
]

const Tree = {
  id:"A",
  type:"OR",
  sub:[{
    type:"AND",
    sub:[{
      id:"E"
    },{
      id:"F"
    }]
  },{
    id:"B",
    type:"AND",
    sub:[{
      id:"C"
    },{
      id:"D"
    }]
  }]
}
const Nodes=[],Links=[],Points=[],Ties=[]
class Node {
  constructor(id,altId){
    this.ports = []
    if(id){
      this.id = id
      this.p1 = { 
        id:this.id+'.p1',
        x:WIDTH/2,
        y:HEIGHT/2,
      }
      this.p2 = { 
        id:this.id+'.p2',
        x:WIDTH/2,
        y:HEIGHT/2,
      }
      Points.push(this.p1,this.p2)
      Ties.push({
        inner:true,
        source:this.p1,
        target:this.p2
      })
    } else {
      this.id = altId
      this.p1 = { 
        id:this.id+'.p1',
        x:WIDTH/2,
        y:HEIGHT/2, 
      }
      this.p2 = this.p1
      this.mid = true
      Points.push(this.p1)
    }
  }
  update(){
    this.x = (this.p1.x+this.p2.x-NODE_WIDTH)/2
    this.y = (this.p1.y+this.p2.y-NODE_HEIGHT)/2
    this.a = -Math.atan2(this.p1.y - this.p2.y,this.p2.x - this.p1.x)*180/Math.PI
    var portside = getPosition(this.x+NODE_WIDTH/2,this.y+NODE_HEIGHT/2,-this.a,this.mid?0:NODE_WIDTH/2)
    // ((n,i) => n-1&&((12/(n-1))*i-(12/2)))(2,1)
    this.ports.forEach((port,i) => {
      // var dist = (NODE_HEIGHT/(this.ports.length+1))*i-(NODE_HEIGHT/2)+(NODE_HEIGHT/(this.ports.length+1));
      var dist = this.ports.length-1&&(NODE_HEIGHT/(this.ports.length-1)*i-(NODE_HEIGHT/2));
      [port.x,port.y] = getPosition(...portside,-(this.a+90),dist)
    })
    this.enter = [];
    [this.enter.x,this.enter.y] = getPosition(this.x+NODE_WIDTH/2,this.y+NODE_HEIGHT/2,-this.a,this.mid?0:-NODE_WIDTH/2)
  }
}
function parseTree(node,altId){
  var temp = new Node(node.id,altId)
  node.sub && node.sub.forEach((n,i) => {
    var port = temp.ports[0]
    if(i == 0 || node.type=="OR"){
      port = { i:i, _:temp }
      temp.ports.push(port)
    }
    var link = {
      source:port,
      target:parseTree(n,temp.id+'-'+i)
    }
    Ties.push({
      source:temp.p2.id,
      target:link.target.p1.id,
    })
    Links.push(link)
  })
  Nodes.push(temp)
  return temp
}
parseTree(Tree)


const simulation = d3.forceSimulation()
  .nodes(Points)
  .force('link', d3.forceLink(Ties)
    .id(d => d.id)
    .distance(d => d.inner?NODE_WIDTH:30)
    .strength(d => 1))
  .force('charge', d3.forceManyBody())
  .force('center', d3.forceCenter(WIDTH/2,HEIGHT/2))
  .on('tick',ticked)

const dragDrop = d3.drag()
  .on('start', node => {
    [node.p1.fx,node.p1.fy] = getPosition(node.x+NODE_WIDTH/2, node.y+NODE_HEIGHT/2, -node.a, -NODE_WIDTH/2);
    [node.p2.fx,node.p2.fy] = getPosition(node.x+NODE_WIDTH/2, node.y+NODE_HEIGHT/2, -node.a, NODE_WIDTH/2);
  })
  .on('drag', node => {
    simulation.alphaTarget(0.5).restart();
    [node.p1.fx,node.p1.fy] = getPosition(d3.event.x+NODE_WIDTH/2, d3.event.y+NODE_HEIGHT/2, -node.a, -NODE_WIDTH/2);
    [node.p2.fx,node.p2.fy] = getPosition(d3.event.x+NODE_WIDTH/2, d3.event.y+NODE_HEIGHT/2, -node.a, NODE_WIDTH/2);
  })
  .on('end', node => {
    if(!d3.event.active){
      simulation.alphaTarget(0)
    }
    node.p1.fx = null
    node.p1.fy = null
    node.p2.fx = null
    node.p2.fy = null
  })



const text = svg.append('g').selectAll('text')
  .data(Nodes.filter(n => !n.mid))
  .enter().append('text')
  .text(d => d.id)
  .attr('text-anchor','middle')
  .attr('dominant-baseline','central')

const ties = svg.append('g')
  .attr('class','ties')
  .selectAll('line')
  .data(Ties)
  .enter().append('line')

const links = svg.append('g')
  .attr('class','links')
  .selectAll('line')
  .data(Links)
  .enter().append('line')

const nodes = svg.append('g')
  .attr('class','nodes')
  .selectAll('rect')
  .data(Nodes.filter(n => !n.mid))
  .enter().append('rect')
  .attr('width',NODE_WIDTH)
  .attr('height',NODE_HEIGHT)
  .call(dragDrop)

function ticked(){
  // Nodes.forEach(node => {
  //   node.x = (node.from.x+node.to.x)/2-nodesize.width/2
  //   node.y = (node.from.y+node.to.y)/2-nodesize.height/2
  //   node.a = (-getAngle(node.to,node.from))%360
  // })
  // Links.forEach(d => {
  //   d.s = getPosition(d.source.x+nodesize.width/2, d.source.y+nodesize.height/2, -d.source.a, nodesize.width/2)
  //   d.t = getPosition(d.target.x+nodesize.width/2, d.target.y+nodesize.height/2, -d.target.a, -nodesize.width/2)
  // })
  Nodes.forEach(node => node.update())
  nodes
    .attr('x',d => d.x)
    .attr('y',d => d.y)
    .attr('transform',d => `rotate(${d.a},${d.x+NODE_WIDTH/2},${d.y+NODE_HEIGHT/2})`)

  text
    .attr('x',d => d.x+NODE_WIDTH/2)
    .attr('y',d => d.y+NODE_HEIGHT/2)
    .attr('transform',d => `rotate(${d.a+90},${d.x+NODE_WIDTH/2},${d.y+NODE_HEIGHT/2})`)

  ties
    .attr('x1',d => d.source.x)
    .attr('y1',d => d.source.y)
    .attr('x2',d => d.target.x)
    .attr('y2',d => d.target.y)

  links
    .attr('x1',d => d.source.x)
    .attr('y1',d => d.source.y)
    .attr('x2',d => d.target.enter.x)
    .attr('y2',d => d.target.enter.y)
}