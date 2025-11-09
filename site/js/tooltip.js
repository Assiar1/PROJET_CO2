function tooltip(selection, content) {
    const tooltip = d3.select("#tooltip");

    selection.on("mouseover.tooltip", function (event, d) {
        tooltip.style("opacity", 1)
            .html(content(d))
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
    }).on("mouseout.tooltip", function () {
        tooltip.style("opacity", 0);
    }).on("mousemove.tooltip", function (event) {
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
    });
}