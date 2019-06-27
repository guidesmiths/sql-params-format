# sql-format

a wrapper around pg-format to allow named parameters to sql queries.

```js
// default usage, no named params.  operates just like pg-format
const sql = 'insert into %I (select * from foo where %s and bar > %L)';
const formatted = format(sql, 'a_table', 'something=another', 123);
  formatted => insert into a_table (select * from foo where something=another and bar > '123')

// using named parameters

const sql = 'insert into %I:one (select * from foo where %s:two and bar > %L:three)';
const formatted = format(sql, {one: 'a_table', two: 'something=another', three: 123});
  formatted => insert into a_table (select * from foo where something=another and bar > '123')
    
```

It will ignore any unused named parameters.
Parameters used more than once in the query need only be passed once.

Special note, this will convert moment objects to date objects if passed as parameters.
