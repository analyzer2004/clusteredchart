# 3D Clustered Chart

**ClusteredChart** is a 3D representation of the grouped column chart visualizing categorical dataset in three-dimensional space.
For live demos and sample codes, please see [3D Clustered Chart](https://observablehq.com/@analyzer2004/3d-clustered-chart)

<img src="https://github.com/analyzer2004/clusteredchart/blob/master/images/cover.png" width="768">

## API Reference
* **ClusteredChart(container)** - Constructs a new instance of ClusteredChart with default settings. The container is optional and it can be any DOM element.
* **size([width, height])** - Sets the dimensions to specified width and height and returns this chart.
* **dimensions(dimensions)** - Sets the dimensions of the 3D space to specified width, height and depth and returns this chart.
  * dimensions.**width** - default is 5.
  * dimensions.**height** - default is 2.
  * dimensions.**depth** - default is 5.
* **options(options)** - Overrides the default options and returns this chart.
  * options.**animation** - a boolean value that indicates whether the animation effects is enabled. Default is true.  
  * options.**font** - specifies the font. The value can be an url, a Three.js font instance or an instance of JSON font. 
  * options.**backgroundColor** - specifies the background color. Default is 0xffffff.
  * options.**textColor** - specifies the text color. Default is 0x666666.
  * options.**lineColor** - specifies the line color. Default is 0xcccccc.
* **bar(bar)** - Overrides the default bar settings and returns this chart.
  * bar.**scale** - sets the scale of bars to specified x and z. Default is {x: 0.65, z: 0.65}.
  * bar.**opacity** - sets the opacity of bars. Default is 0.85.
  * bar.**isOrdinal** - specifies whether the palette is categorical. Default is true.
  * bar.**palette** - sets the color palette to a categorical scheme or a continuous interpolator. Default is d3.schemeTableau10.
* **wall(wall)** - Overrides the default wall settings and returns this chart.
  * wall.**visible** - a boolean value that indicates whether the wall is visible. Default is true.
  * wall.**color** - specifies the wall color. Default is 0xeeeeee.
  * wall.**opacity** - sets the opacity of the walls. Default is 0.9.
  * wall.**showTicks** - sepcifies whether the ticks are visible.
  * wall.**tickFormat** - specifies the tick format. Default is "~s".
* **floor(floor)** - Overrides the default floor settings and returns this chart.
  * floor.**visible** - a boolean value that indicates whether the floor is visible. Default is true.
  * floor.**color** - specifies the floor color. Default is 0xeeeeee.
  * floor.**opacity** - sets the opacity of the floor. Default is 0.9.
  * floor.**showTicks** - sepcifies whether the ticks are visible.  
* **tooltip(tooltip)** - Overrides the default tooltip settings and returns this chart.
  * tooltip.**textColor** - sets the text color of the tooltip. Default is black.  
  * tooltip.**fillColor** - sets the background color of the tooltip. Default is rgba(255, 255, 255, 0.75).
  * tooltip.**scale** - sets the scale of the tooltip box. Default is 0.4.
* **column(column)** - Specifies the column names for each axis and return this chart.
  * column.**x** - sets the column name for x axis
  * column.**y** - sets the column name for y axis
  * column.**z** - sets the column name for z axis

Depending on the data structure, for dataset like the first one below, column.**y** always represents the value which is the **"profit"** in this case, **x** is the **category** and **z** represents the **data points**.
\`\`\`{javascript}
  ...
  .column({
    x: "territory",
    y: "profit", 
    z: "quarter"
  })
  ...
\`\`\`
<img src="https://github.com/analyzer2004/clusteredchart/blob/master/images/data1.png">

You only need to specify the column.**x** if the dataset has already been categorized.
\`\`\`{javascript}
  ...
  .column({ x: "territory" })
  ...
\`\`\`

<img src="https://github.com/analyzer2004/clusteredchart/blob/master/images/data2.png">

* **data(_)** - Sets the data and returns this chart.
* **render()** - Renders the chart and returns it's instance.
* **dispose()** - Cleans up allocated memory and return this chart.
* **renderer** - This property exposes the internal WebGLRenderer.
* **onhover(d)** - Occurs when user hover over a bar.
* **onclick(d)** - Occurs when user click on a bar.`