// Data utilities
// 處理空值
// 遇到NA就設定為undefined,要不然就維持原字串
// function input為string, function只有一行,可省略大括號, 三元運算, 遇到NA就換成JS的undefined(python為np.nan)
const parseNA = string => (string === 'NA' ? undefined : string);
// 處理日期
// d3.timeParse()是一個function,輸出值也是一個function,後面可以接小括號把string送進去，
// 將年月日這種格式轉變成JavaScript的日期時間格式
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

// budget: "42150098"
// genre: "Animation"
// genres: "[{\"id\": 16, \"name\": \"Animation\"}, {\"id\": 35, \"name\": \"Comedy\"}, {\"id\": 10751, \"name\": \"Family\"}]"
// homepage: "http://toystory.disney.com/toy-story"
// id: "862"
// imdb_id: "tt0114709"
// original_language: "en"
// overview: "Led by Woody, Andy's toys live happily in his room until Andy's birthday brings Buzz Lightyear onto the scene. Afraid of losing his place in Andy's heart, Woody plots against Buzz. But when circumstances separate Buzz and Woody from their owner, the duo eventually learns to put aside their differences."
// popularity: "21.946943"
// poster_path: "/rhIRbceoE9lR4veEXuwCC2wARtG.jpg"
// production_countries: "[{\"iso_3166_1\": \"US\", \"name\": \"United States of America\"}]"
// release_date: "1995-10-30"
// revenue: "524844632"
// runtime: "81"
// status: "Released"
// tagline: "NA"
// title: "Toy Story"
// video: "FALSE"
// vote_average: "7.7"
// vote_count: "5415"

// 轉換成數字
// 給callback function, d:每一筆電影整包資料
function type(d) {
    const date = parseDate(d.release_date);
    return {
        budget: +d.budget, // 字串轉數字, 前面有"+""
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d => d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_average,
    }
};

// Data selection
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_date > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

function prepareBarChartData(data) {
    console.log(data);
    const dataMap = d3.rollup(
        data,
        v => d3.sum(v, leaf => leaf.revenue), // 將revenue加總
        d => d.genre // 依電影分類groupby
    );
    const dataArray = Array.from(dataMap, d => ({ genre: d[0], revenue: d[1] }));
    return dataArray;
}

function prepareScatterData(data){
    // comparison sort, b-a:由大到小
    return data.sort((a,b)=>b.budget - a.budget).filter((d,i)=>i<100);
}

function addLabel(axis, label, x, y){
    // axis 呼叫哪一個軸
    axis.selectAll('.tick:last-of-type text').clone().text(label)
        .attr('x',x).attr('y',y)
        .style('text-anchor','start')
        .style('font-weight','bold')
        .style('fill','#555');
}

function setupCanvas(scatterData) {
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 40, bottom: 40, left: 80 };
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    // Draw Scatter Base 基底
    const this_svg = d3.select('.scatter-plot-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height).append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);

    // scale 設定資料與範圍的對應關係(x:budget, y:revenue)
    // d3.extent find the max & min in revenue
    const xExtent = d3.extent(scatterData, d => d.budget);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, chart_width]);
    // v1: min -> max, range:實際要放東西的地方, domain: 資料

    // v2: 0 ~ max
    // const xMax = d3.max(barChartData, d => d.revenue);
    // debugger;
    // const xScale_v2 = d3.scaleLinear().domain([0, xMax]).range([0, chart_width]);
    // v3: short writing for V2
    // const xScale_v3 = d3.scaleLinear([0, xMax], [0, chart_width]);

    // 垂直空間的分配 - 平均分布給各種類
    const yExtent = d3.extent(scatterData, d => d.revenue)
    const yScale = d3.scaleLinear().domain(yExtent).range([chart_height,0]);
    // 電腦科學原點從左上角出發，數學原點從左下角出發，為使營收小放最下方，要與座標相反

    // Draw Scatters
    this_svg.selectAll('.scatter').data(scatterData).enter()
            .append('circle').attr('class', 'scatter')
            .attr('cx', d => xScale(d.budget))
            .attr('cy', d => yScale(d.revenue))
            .attr('r', 3)
            .style('fill', 'dodgerblue')
            .style('fill-opacity',0.5) // 不透明度 0~1, 0:完全透明且不可見

    // Draw header
    const header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`)
        .append('text');
    header.append('tspan').text('Budget vs. Revenue in $US');
    header.append('tspan').text('Top 100 films by budget, 2000-2009')
        .attr('x', 0).attr('y', 20).style('font-size', '0.8em').style('fill', '#555');

    // 刻度與軸線 - X
    // ticks 決定約略有幾個刻度(依數值而定)
    // tickSizeInner : the length of the tick lines
    // tickSizeOuter : the length of the square ends of the domain path
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(formatTicks)
                                       .tickSizeInner(-chart_height)
                                       .tickSizeOuter(0);
    const xAxisDraw = this_svg.append('g').attr('class','x axis')
                                          .attr('transform',`translate(-10,${chart_height+10})`)
                                          .call(xAxis)
                                          .call(addLabel,'Budget',25,0);
    // 拉開字與軸的距離
    xAxisDraw.selectAll('text').attr('dy','2em');

    // 刻度與軸線 - Y
    // tickSize:一次設定好tickSizeinner & tickSizeOuter
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
                                     .tickSizeInner(-chart_height)
                                     .tickSizeOuter(0);
    const yAxisDraw = this_svg.append('g').attr('class','y axis')
                                          .attr('transform',`translate(-10,10)`)
                                          .call(yAxis)
                                          .call(addLabel,'Revenue',-30,-30);
    yAxisDraw.selectAll('text').attr('dx','-2em');

    function brushed(e){
        if(e.selection){
            // 取得選取的矩形座標
            const [[x0,y0],[x1,y1]] = e.selection;
            // 判斷有哪些資料落在選取範圍中
            const selected = scatterData.filter(
                d =>
                    x0 <= xScale(d.budget) && xScale(d.budget) < x1 &&
                    y0 <= yScale(d.revenue) && yScale(d.revenue) < y1
            );
            // console.log(selected);
            updateSelected(selected);
            highlightSelected(selected);
        }else{
            d3.select('.selected-body').html('');
            highlightSelected([]);
        }

    }

    function highlightSelected(data){
        const selectedIDs = data.map(d=>d.id);
        d3.selectAll('.scatter').filter(d=>selectedIDs.includes(d.id))
          .style('fill','green');
        
          d3.selectAll('.scatter').filter(d=>!selectedIDs.includes(d.id))
          .style('fill','dodgerblue');
        
    }




    let selectedId;

    function mouseoverListItem(){
        selectedId = d3.select(this).data()[0].id;
        // debugger;
        d3.selectAll('.scatter').filter(d=>d.id === selectedId)
          .transition().attr('r',6).style('fill','coral');
    }

    function mouseoutListItem(){
        selectedId = d3.select(this).data()[0].id;
        // debugger;
        d3.selectAll('.scatter').filter(d=>d.id === selectedId)
          .transition().attr('r',3).style('fill','green');
    }

    function updateSelected(data){
        d3.select('.selected-body').selectAll('.selected-element')
          .on('mouseover',mouseoverListItem)
          .on('mouseout',mouseoutListItem)
          .data(data, d=>d.id).join(
            enter => {
                enter.append('p').attr('class','selected-element')
                     .html(
                        d=>`<span class="selected-title">${d.title}</span>,
                            ${d.release_year}
                            <br>budget:${formatTicks(d.budget)} |
                            revenue : ${formatTicks(d.revenue)}`
                      );
            },
            update => {
                update
            },
            exit => {
                exit.remove();
            }
          );
    }

    // Add brush
    const brush = d3.brush().extent([[0,0],[svg_width,svg_height]]).on('brush end',brushed);
    this_svg.append('g').attr('class','brush').call(brush);

    d3.select('.selected-container')
        .style('width',`${svg_width}px`)
        .style('height',`${svg_height}px`);


}

function formatTicks(d) {
    return d3.format('~s')(d)
    .replace('M', 'mil')
    .replace('G', 'bil')
    .replace('T', 'tri')
}


// Main
function ready(movies) {
    const moviesClean = filterData(movies);
    // console.log(moviesClean);
    // const barChartData = prepareBarChartData(moviesClean).sort(
    //     (a, b) => {
    //         return d3.descending(a.revenue, b.revenue);
    //     }
    // );
    const scatterData = prepareScatterData(moviesClean);
    // console.log(barChartData);
    // setupCanvas(barChartData);
    console.log(scatterData);
    setupCanvas(scatterData);
}

// Load Data
d3.csv('interactive_scatter_plot/movies.csv', type).then(
    res => {
        ready(res);
        // console.log(res);
    }
);

