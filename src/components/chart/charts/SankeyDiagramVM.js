import { makeAutoObservable } from "mobx";
import * as d3 from "d3";
import * as d3Sankey from "d3-sankey";

export class SankeyDiagramVM{
    constructor(rootStore){
        this.datasetStore = rootStore.datasetStore;
        this.distanceMatricesStore = rootStore.distanceMatricesStore;
		this.preferencesStore = rootStore.preferencesStore;
        makeAutoObservable(this, {datasetStore: false, preferencesStore:false}, {autoBind: true});
    };

    get matrices(){
        return this.distanceMatricesStore.distanceMatrices.slice();
      }

    get data(){
		return this.datasetStore.selectedData.slice(0,1000);
	};

    get distanceMatrixName(){
        return this.preferencesStore.sankeyDiagramPreferences.distanceMatrixName;
    }

    get distanceMatrix(){
        return this.distanceMatricesStore.getDistanceMatrixByName(this.distanceMatrixName);
    }

    get linkColor(){
        return this.preferencesStore.sankeyDiagramPreferences.linkColor;
    }

    get distMin(){
    	return this.preferencesStore.sankeyDiagramPreferences.distMin;
	}
	get distMax(){
    	return this.preferencesStore.sankeyDiagramPreferences.distMax;
	}

    get align(){
        return this.preferencesStore.sankeyDiagramPreferences.align;
    }

    get selectedLinks(){
        return this.distanceMatrix.links.filter((element) => { return element.value >= this.distMin && element.value <= this.distMax ? element : null} );
    }

    get selectedNodes(){
        return this.distanceMatrix.nodes.filter((element) => {
            if (this.selectedLinks.some((link) => {return link['source'] == element.id || link['target']==element.id})) return element })
    }

    get sankeyDiagramDiv(){
        return document.getElementById("sankeyDiagram");
    }

    // Copyright 2021 Observable, Inc.
    // Released under the ISC license.
    // https://observablehq.com/@d3/sankey-diagram
    SankeyChart({
        nodes, // an iterable of node objects (typically [{id}, …]); implied by links if missing
        links // an iterable of link objects (typically [{source, target}, …])
    }, {
        format = ",", // a function or format specifier for values in titles
        align = "justify", // convenience shorthand for nodeAlign
        nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
        nodeGroup, // given d in nodes, returns an (ordinal) value for color
        nodeGroups, // an array of ordinal values representing the node groups
        nodeLabel, // given d in (computed) nodes, text to label the associated rect
        nodeTitle = d=> d, // given d in (computed) nodes, hover text
        nodeAlign = align, // Sankey node alignment strategy: left, right, justify, center
        nodeWidth = 15, // width of node rects
        nodePadding = 10, // vertical separation between adjacent nodes
        nodeLabelPadding = 6, // horizontal separation between node and label
        nodeStroke = "currentColor", // stroke around node rects
        nodeStrokeWidth, // width of stroke around node rects, in pixels
        nodeStrokeOpacity, // opacity of stroke around node rects
        nodeStrokeLinejoin, // line join for stroke around node rects
        linkSource = ({source}) => source, // given d in links, returns a node identifier string
        linkTarget = ({target}) => target, // given d in links, returns a node identifier string
        linkValue = ({value}) => value, // given d in links, returns the quantitative value
        linkPath = d3Sankey.sankeyLinkHorizontal(), // given d in (computed) links, returns the SVG path
        linkTitle = d => `${d.source.id} → ${d.target.id}\n${format(d.value)}`, // given d in (computed) links
        linkColor = "source-target", // source, target, source-target, or static color
        linkStrokeOpacity = 0.95, // link stroke opacity
        linkMixBlendMode = "multiply", // link blending mode
        colors = d3.schemeTableau10, // array of colors
        width = 640, // outer width, in pixels
        height = 400, // outer height, in pixels
        marginTop = 5, // top margin, in pixels
        marginRight = 1, // right margin, in pixels
        marginBottom = 5, // bottom margin, in pixels
        marginLeft = 1, // left margin, in pixels
    } = {}) {
        var dimRed = this.distanceMatrix.dimensionsToRedux.slice().map(d => d.value);
        console.log(dimRed)
        
        // Convert nodeAlign from a name to a function (since d3-sankey is not part of core d3).
        if (typeof nodeAlign !== "function") nodeAlign = {
            left: d3Sankey.sankeyLeft,
            right: d3Sankey.sankeyRight,
            center: d3Sankey.sankeyCenter
        }[nodeAlign] ?? d3Sankey.sankeyJustify;
        
        // Compute values.
        const LS = d3.map(links, linkSource).map(intern);
        const LT = d3.map(links, linkTarget).map(intern);
        const LV = d3.map(links, linkValue);
        //if (nodes === undefined) nodes = Array.from(d3.union(LS, LT), id => ({id}));
        const N = d3.map(nodes, nodeId).map(intern);
        const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
        const Tt = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
        // Replace the input nodes and links with mutable objects for the simulation.
        nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
        links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i], value: LV[i]}));
        
        // Ignore a group-based linkColor option if no groups are specified.
        if (!G && ["source", "target", "source-target"].includes(linkColor)) linkColor = "currentColor";
    
        // Compute default domains.
        if (G && nodeGroups === undefined) nodeGroups = G;
    
        // Construct the scales.
        const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);
        
        // Compute the Sankey layout.
        d3Sankey.sankey()
            .nodeId(({index: i}) => N[i])
            .nodeAlign(nodeAlign)
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]])
        ({nodes, links});
    
        // Compute titles and labels using layout nodes, so as to access aggregate values.
        if (typeof format !== "function") format = d3.format(format);
        //const Tl = nodeLabel === undefined ? N : nodeLabel == null ? null : d3.map(nodes, nodeLabel);
        
        const Lt = linkTitle == null ? null : d3.map(links, linkTitle);
    
        // A unique identifier for clip paths (to avoid conflicts).
        const uid = `O-${Math.random().toString(16).slice(2)}`;
    
        const svg = d3.select("#sankeyDiagram")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
    
        const node = svg.append("g")
            .attr("stroke", nodeStroke)
            .attr("stroke-width", nodeStrokeWidth)
            .attr("stroke-opacity", nodeStrokeOpacity)
            .attr("stroke-linejoin", nodeStrokeLinejoin)
        .selectAll("rect")
        .data(nodes)
        .join("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0);
        console.log(nodes)
        if (G) node.attr("fill", ({index: i}) => color(G[i]));
        if (Tt) node.append("title").text(function(d,i){
            var tit =Tt[i]['id'];
            dimRed.forEach(dim => (tit+="\n"+dim+": "+Tt[i][dim]))
            return tit;
          }
        );
    
        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-opacity", linkStrokeOpacity)
        .selectAll("g")
        .data(links)
        .join("g")
            .style("mix-blend-mode", linkMixBlendMode);
    
        if (linkColor === "source-target") link.append("linearGradient")
            .attr("id", d => `${uid}-link-${d.index}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", d => d.source.x1)
            .attr("x2", d => d.target.x0)
            .call(gradient => gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", ({source: {index: i}}) => color(G[i])))
            .call(gradient => gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", ({target: {index: i}}) => color(G[i])));
    
        link.append("path")
            .attr("d", linkPath)
            .attr("stroke", linkColor === "source-target" ? ({index: i}) => `url(#${uid}-link-${i})`
                : linkColor === "source" ? ({source: {index: i}}) => color(G[i])
                : linkColor === "target" ? ({target: {index: i}}) => color(G[i])
                : linkColor)
            .attr("stroke-width", ({width}) => Math.max(1, width))
            .call(Lt ? path => path.append("title").text(({index: i}) => Lt[i]) : () => {});
    
        /*if (Tl) svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10)
        .selectAll("text")
        .data(nodes)
        .join("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + nodeLabelPadding : d.x0 - nodeLabelPadding)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(({index: i}) => Tl[i]);*/
    
        function intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
        }
    
        return Object.assign(svg.node(), {scales: {color}});
    };

    renderChart(){
        if(this.sankeyDiagramDiv.firstChild !== null)
            this.sankeyDiagramDiv.firstChild.remove();
        
        if(this.distanceMatrixName === undefined){
            this.sankeyDiagramDiv.append(document.createElement("div"));
            this.sankeyDiagramDiv.firstChild.innerHTML= "Il SankeyDiagram verrà visualizzato appena verrà selezionata la matrice delle distanze da utilizzare";
            this.sankeyDiagramDiv.firstChild.setAttribute("id", "data-visualization");
            document.getElementById("downloadSvgGraph").style.display="none";
            this.sankeyDiagramDiv.firstChild.setAttribute("class","black");
            return null;
        }
        if(this.selectedLinks.length <1 & this.selectedNodes.length <2){
            this.sankeyDiagramDiv.append(document.createElement("div"));
            this.sankeyDiagramDiv.firstChild.innerHTML= "Nessun link trovato nell'intervallo richiesto";
            this.sankeyDiagramDiv.firstChild.setAttribute("id", "data-visualization")
            this.sankeyDiagramDiv.firstChild.setAttribute("class","black");
            return null;
        }
        this.sankeyDiagramDiv.setAttribute("class", "white")

        console.log(this.selectedNodes)
        this.SankeyChart({
            nodes: this.selectedNodes,
            links: this.selectedLinks,
          }, {
            nodeGroup: d => d.id.split(/\W/)[0], // take first word for color
            nodeAlign: this.align,
            linkColor: this.linkColor,
            format: (f => d => `${f(d)}`)(d3.format(",.1~f")),
            width: 1210,
            height: 950
        })
        document.getElementById("downloadSvgGraph").style.display="block";
    }
}