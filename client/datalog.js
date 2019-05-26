
(function() {

  function expand(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
  };

  function absolute(url) {
    // https://github.com/bitinn/node-fetch/issues/481
    return url.replace(/^(https?:)\/([^\/])/,`$1//${location.host}/$2`)
  }

  function parse(text) {
    var schedule = {sites:{}, chunk:'hour', interval:5000, keep:24}
    let output = text.split(/\r?\n/).map (line => {
      var m
      if (m = line.match(/^HOUR (\d+)$/)) {
        schedule.chunk = 'hour'
        schedule.interval = 1000*60*60 / m[1]
      } else if (m = line.match(/^DAY (\d+)$/)) {
        schedule.chunk = 'day'
        schedule.interval = 1000*60*60*24 / m[1]
      } else if (m = line.match(/^MONTH (\d+)$/)) {
        schedule.chunk = 'month'
        schedule.interval = 1000*60*60*24*30 / m[1]
      } else if (m = line.match(/^KEEP (\d+)$/)) {
        schedule.keep = m[1]*1
      } else if (m = line.match(/^SENSOR (\w+) (https?:\S+)$/)) {
        schedule.sites[m[1]] = absolute(m[2])
        line = `SENSOR <a href="${absolute(m[2])}" target=_blank>${m[1]} <img src="/images/external-link-ltr-icon.png"></a>`
      } else {
        line = `<font color=gray>${expand(line)}</font>`
      }
      return line
    }).join('<br>')
    return {output, schedule}
  }

  function emit($item, item) {

    $item.addClass('server-source')
    $item.get(0).service = () => {
      let site = location.host
      let slug = $page.attr('id').split('_')[0]
      return {site, slug, id:item.id, plugin: 'datalog', parse: parse(item.text)}
    }

    let parsed = parse(item.text)
    $item.append(`
      <div style="background-color:#eee; padding:15px; margin-block-start:1em; margin-block-end:1em;">
        ${parsed.output}
        <center><button disabled>wait</button></center>
      </div>`);
  };

  function bind($item, item) {
    $item.dblclick(() => {
      return wiki.textEditor($item, item);
    });

    let $button = $item.find('button')
    let parsed = parse(item.text)

    function action(command) {
      $button.prop('disabled',true)
      $page = $item.parents('.page')
      if($page.hasClass('local')) {
        return
      }
      slug = $page.attr('id').split('_')[0]
      $.ajax({
        type: "POST",
        url: `/plugin/datalog/${slug}/id/${item.id}`,
        data: JSON.stringify(command),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data){
          $button.text((data.status == 'active') ? 'stop' : 'start')
          $button.prop('disabled',false)
        },
        failure: function(err) {
          console.log(err)
        }
      })
    }
    $button.click(event => action({action:$button.text(),schedule:parsed.schedule}))
    action({})
  }

  if (typeof window !== "undefined" && window !== null) {
    window.plugins.datalog = {emit, bind};
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {expand};
  }

}).call(this);
