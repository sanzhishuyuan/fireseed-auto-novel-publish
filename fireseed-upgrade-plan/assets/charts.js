(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var danger = style.getPropertyValue('--danger').trim();
  var warning = style.getPropertyValue('--warning').trim();
  var success = style.getPropertyValue('--success').trim();

  // --- Roadmap Gantt Chart ---
  var chart = echarts.init(document.getElementById('chart-roadmap'), null, { renderer: 'svg' });

  var phases = ['阶段四：生态扩展', '阶段三：Agent API', '阶段二：OIDC 服务', '阶段一：技术债务'];
  var weekLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9'];

  // Each task: [startWeek(0-indexed), duration, phaseIndex(0=bottom)]
  var tasks = [
    // Phase 1 (bottom, index 3)
    { name: 'Vite 残留清理', start: 0, duration: 0.5, phase: 3, color: success },
    { name: 'SEO 基础设施修复', start: 0, duration: 0.7, phase: 3, color: success },
    { name: '性能优化（字体/请求/缓存）', start: 0.3, duration: 0.7, phase: 3, color: success },
    // Phase 2 (index 2)
    { name: '数据库 Schema 扩展', start: 1, duration: 0.5, phase: 2, color: accent },
    { name: 'OIDC Provider 部署', start: 1.3, duration: 1.5, phase: 2, color: accent },
    { name: 'Agent 自动注册端点', start: 2, duration: 1, phase: 2, color: accent },
    { name: 'Scope 权限中间件', start: 2.5, duration: 1, phase: 2, color: accent },
    // Phase 3 (index 1)
    { name: '创作 API（POST/PUT/DELETE）', start: 4, duration: 1, phase: 1, color: warning },
    { name: '社区信号 API', start: 4.5, duration: 0.8, phase: 1, color: warning },
    { name: 'Agent 管理 API + 安全加固', start: 5, duration: 1, phase: 1, color: warning },
    // Phase 4 (top, index 0)
    { name: 'Agent SDK 开发', start: 6.5, duration: 1.2, phase: 0, color: accent2 },
    { name: 'Agent 展示与发现', start: 7, duration: 1, phase: 0, color: accent2 },
    { name: '高级功能（Webhook/协作/监控）', start: 7.5, duration: 1.5, phase: 0, color: accent2 },
  ];

  var seriesData = tasks.map(function(t, i) {
    return {
      name: t.name,
      type: 'custom',
      renderItem: function(params, api) {
        var categoryIndex = api.value(0);
        var start = api.value(1);
        var end = api.value(2);
        var height = api.size([0, 1])[1] * 0.6;

        var rectShape = echarts.graphic.clipRectByRect(
          {
            x: api.coord([start, categoryIndex])[0],
            y: api.coord([0, categoryIndex])[1] - height / 2,
            width: api.coord([end, categoryIndex])[0] - api.coord([start, categoryIndex])[0],
            height: height
          },
          {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height
          }
        );

        return rectShape && {
          type: 'rect',
          transition: ['shape'],
          shape: rectShape,
          style: {
            fill: api.visual('color')
          },
          emphasis: {
            style: {
              fillOpacity: 0.85
            }
          }
        };
      },
      encode: {
        x: [1, 2],
        y: 0
      },
      data: [[t.phase, t.start, t.start + t.duration]],
      itemStyle: {
        color: t.color,
        opacity: 0.85,
        borderRadius: 4
      }
    };
  });

  // Milestone markers
  var milestoneData = [
    [0.7, 3, 'M1'],
    [3.5, 2, 'M2'],
    [6, 1, 'M3'],
    [9, 0, 'M4']
  ];

  seriesData.push({
    name: '里程碑',
    type: 'scatter',
    symbol: 'diamond',
    symbolSize: 16,
    data: milestoneData.map(function(m) {
      return {
        value: [m[0], m[1]],
        label: {
          show: true,
          formatter: m[2],
          position: 'top',
          color: danger,
          fontWeight: 'bold',
          fontSize: 12
        }
      };
    }),
    itemStyle: {
      color: danger
    }
  });

  chart.setOption({
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink, fontSize: 13 },
      formatter: function(params) {
        if (params.seriesName === '里程碑') {
          return '<b>' + params.data.label.formatter + '</b>';
        }
        var task = tasks[params.dataIndex];
        if (!task) return '';
        var weeks = Math.round(task.duration * 10) / 10;
        return '<b>' + task.name + '</b><br/>工期: ~' + (weeks < 1 ? Math.round(weeks * 7) + ' 天' : weeks + ' 周');
      }
    },
    legend: {
      show: false
    },
    grid: {
      left: 140,
      right: 40,
      top: 30,
      bottom: 40
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 9,
      interval: 1,
      axisLabel: {
        formatter: function(v) { return 'W' + (v + 1); },
        color: muted,
        fontSize: 12
      },
      axisLine: { lineStyle: { color: rule } },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: phases,
      axisLabel: {
        color: ink,
        fontSize: 12,
        fontWeight: 600
      },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    series: seriesData
  });

  window.addEventListener('resize', function() { chart.resize(); });
})();
