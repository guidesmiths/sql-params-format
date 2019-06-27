import assert from 'assert';
import moment from 'moment';
import {format, formatFile} from '../../src/index';



describe('formatter', () => {
  it('should maintain basic pg formatting', () => {
    const sql = 'insert into %I (select * from foo where %s and bar > %L)';
    const replaced = 'insert into a_table (select * from foo where something=another and bar > \'123\')';
    assert.equal(replaced, format(sql, 'a_table', 'something=another', 123));
  });

  it('should do basic named formatting', () => {
    const sql = 'insert into %I:one (select * from foo where %s:two and bar > %L:three)';
    const fmt = 'insert into a_table (select * from foo where something=another and bar > \'123\')';
    assert.equal(fmt, format(sql, {one: 'a_table', two: 'something=another', three: 123}));
  });

  it('should do complex named formatting', () => {
    const sql = '%I:one %s:one %L:one - %I:two %s:two %L:two - %I:one %s:one %L:one )';
    const fmt = 'one one \'one\' - two two \'two\' - one one \'one\' )';
    assert.equal(fmt, format(sql, {one: 'one', two: 'two'}));
  });

  it('should ignore extra params', () => {
    const sql = '%I:one %s:one %L:one - %I:two %s:two %L:two - %I:one %s:one %L:one )';
    const fmt = 'one one \'one\' - two two \'two\' - one one \'one\' )';
    assert.equal(fmt, format(sql, {one: 'one', two: 'two', three: 'three', four: 'four'}));
  });

  it('should be ok when using :: to cast types', () => {
    const sql = 'SELECT event_time::DATE WHERE asset_type=%L:type';
    const fmt = 'SELECT event_time::DATE WHERE asset_type=\'foo\'';
    assert.equal(fmt, format(sql, {type: 'foo'}));
  });

  it('should handle underscores in variable names', () => {
    const sql = 'SELECT event_time::DATE WHERE asset_type=%L:t_y_p_e';
    const fmt = 'SELECT event_time::DATE WHERE asset_type=\'foo\'';
    assert.equal(fmt, format(sql, {t_y_p_e: 'foo'}));
  });

  it('should handle converting moment objects to dates', () => {
    const startTime = moment().utc();

    const sql = 'SELECT * FROM foo WHERE event_time >= %L:startTime';
    const momentFormat = format(sql, {startTime});
    const dateFormat = format(sql, {startTime: startTime.toDate()});
    assert.equal(momentFormat, dateFormat);
  });

  it('should handle this complicated thing from the aggregator', () => {
    const sql = `INSERT INTO %I:finalStep (
  SELECT
    date_id,
    %L:name as thename,
    JSON_EXTRACT_PATH_TEXT(experiments, %L:name) AS variant,
    COUNT(CASE WHEN %s:sample_clause THEN 1 END) as sample_total,
    COUNT(CASE WHEN %s:conversion_clause THEN 1 END) as conversion_total
  FROM %I:eventStream
  WHERE LEN(experiments) > 2
    AND event_time >= %L:start_time AND event_time < %L:end_time
    AND NULLIF(JSON_EXTRACT_PATH_TEXT(experiments, %L:name), '') IS NOT NULL
    AND ( (%s:sample_clause) OR (%s:conversion_clause) )
  GROUP BY 1,2,3
)`;
    const params = {
      finalStep: 'experiments_daily_build_20160901_1934_1',
      name: 'aa_rdp_to_buy_test',
      start_time: new Date('Tue Aug 09 2016 17:00:00 GMT-0700 (PDT)'),
      end_time: new Date('Sun Sep 18 2016 17:00:00 GMT-0700 (PDT)'),
      enabled: true,
      sample_clause: 'event = \'view\' AND asset_type = \'resource\' AND licence_type=\'TES-PAID\'',
      conversion_clause: 'event = \'buy\' AND asset_type = \'resource\'',
      eventStream: 'event_stream'
    };
    const fmt = `INSERT INTO experiments_daily_build_20160901_1934_1 (
  SELECT
    date_id,
    'aa_rdp_to_buy_test' as thename,
    JSON_EXTRACT_PATH_TEXT(experiments, 'aa_rdp_to_buy_test') AS variant,
    COUNT(CASE WHEN event = 'view' AND asset_type = 'resource' AND licence_type='TES-PAID' THEN 1 END) as sample_total,
    COUNT(CASE WHEN event = 'buy' AND asset_type = 'resource' THEN 1 END) as conversion_total
  FROM event_stream
  WHERE LEN(experiments) > 2
    AND event_time >= '2016-08-10 00:00:00.000+00' AND event_time < '2016-09-19 00:00:00.000+00'
    AND NULLIF(JSON_EXTRACT_PATH_TEXT(experiments, 'aa_rdp_to_buy_test'), '') IS NOT NULL
    AND ( (event = 'view' AND asset_type = 'resource' AND licence_type='TES-PAID') OR (event = 'buy' AND asset_type = 'resource') )
  GROUP BY 1,2,3
)`;

    assert.equal(fmt, format(sql, params));
  });

  it('should format literals', () => {
    assert.equal(format.literal(123), '\'123\'');
  });

  it('should format moment literals', () => {
    const now = moment();
    assert.equal(format.literal(now), format.literal(now.toDate()));
  });

  it('should format strings', () => {
    assert.equal(format.string(123), '123');
  });

  it('should format moment strings', () => {
    const now = moment();
    assert.equal(format.string(now), format.string(now.toDate()));
  });

  it('should handle includes', () => {
    const sample = 'dear_sir';
    const formatted = formatFile(__dirname + '/sample.sql', {sample});

    assert.equal(formatted, 'WITH foobar AS (SELECT * FROM dear_sir) SELECT * FROM dear_sir');
  });

  it('should format literals, stripping null characters', () => {
    assert.equal(format.literal('ab\0c'), '\'abc\'');
  });

  it('should maintain basic pg formatting while escaping null characters', () => {
    const sql = 'insert into %I (select * from foo where %s and bar > %L)';
    const replaced = 'insert into a_table (select * from foo where something=another and bar > \'123\')';
    assert.equal(replaced, format(sql, 'a_table', 'some\0thing=anot\0her', 123));
  });

});
