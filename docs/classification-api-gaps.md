# Classification: where the UI and the API disagree

Written against `ts-factory/bublik` PR #353 (`feat/issues`, head `f7bca6c2`).
Every gap here is a server-side limitation the UI works around; each says what
the workaround costs and what one-line change retires it.

## 1. `/issue_rules/` does not return `test_name`

`IssueRuleViewSet.queryset` annotates it:

```python
IssueRule.objects.select_related('issue')
    .annotate(test_name=F('test__name'), issue_title=F('issue__title'))
```

but `IssueRuleSerializer.Meta.fields` lists `issue_title` and not `test_name`.
The annotation exists only so `ordering=test_name` is legal. No other endpoint
maps a test id to a name either — `/history/test_search_options/` returns names
and paths without ids, and `get_test_ids_by_name` is not exposed.

**What the UI does instead**

- The rules table has **no Test column**. Searching still finds rules by test
  name, because the server's `search` matches `test__name` — it just cannot be
  displayed.
- The rule form's test picker (`useKnownTests`) labels its options
  **`Test #42`**, and can only offer tests that some rule already targets,
  because a rules listing is the only place the UI ever sees a test id.
- `EditRuleButton` and `DuplicateRuleButton` are unaffected: they seed from a
  rule that already carries `test`, so neither has to resolve a name.

**The fix**: add `'test_name'` to `IssueRuleSerializer.Meta.fields`. That
restores the column, gives the picker real labels, and — with a test-search
endpoint — would let a rule be written for a test that has never been
classified.

## 2. Multi-value filters: only `state` and `active`

Two filters split on `settings.QUERY_DELIMITER` (`;`), which is also what the
UI's URL state uses, so a facet selection round-trips unchanged:

| Endpoint | Filter | Backend |
| --- | --- | --- |
| `/issues/` | `state` | `state__in=params['state'].split(QUERY_DELIMITER)` |
| `/issue_rules/` | `active` | `active__in=[...]`, rejects anything but `true`/`false` |

Every other filter is compared against **one raw value**:

- `/issues/` — `category` (`rules__category=`)
- `/issue_rules/` — `category` (`category=`), `expected` (a three-way choice of
  `expected` / `unexpected` / `none`)

A `;`-joined value therefore matches no row and the endpoint answers an empty
page for a selection that has plenty.

**What the UI does instead**: `singleValued()` in
`libs/services/bublik-api/src/lib/endpoints/classification-endpoints.ts` sends
the value when exactly one is selected and withholds it when several are. The
table then filters the page it holds — which is only the current page, so a
multi-select on those facets is **page-local**. `classification-endpoints.spec.ts`
pins this behaviour.

**The fix**: `rules__category__in=params['category'].split(QUERY_DELIMITER)` and
the equivalent for `expected`, matching what `state` and `active` already do.

## 3. Filters the API has and the UI does not use

Both viewsets accept date ranges that no control in the UI produces:

| Endpoint | Filters |
| --- | --- |
| `/issues/` | `created_after`, `created_before`, `updated_after`, `updated_before` |
| `/issue_rules/` | `created_after`, `created_before` |

Dates are parsed by `parse_date_param()` and compared with `__date__gte` /
`__date__lte`, so they take a plain `YYYY-MM-DD`.

These are a UI gap, not a server one — nothing is broken, there is simply no
date-range control on either toolbar.

## 4. Ordering fields with no column behind them

`OrderingFilter` accepts more than the tables can sort by. The mapping the UI
does use lives in each table's `ORDERING_BY_COLUMN_ID`, because a column id and
the server's field name are not the same string.

| Endpoint | `ordering_fields` | Used by a column? |
| --- | --- | --- |
| `/issues/` | `created_at` | yes — `created` |
| | `updated_at` | no — there is no Updated column |
| | `title` | yes — `issue` |
| | `state` | yes — `state` |
| `/issue_rules/` | `created_at` | no — the Created column is hidden |
| | `category` | yes — `category` |
| | `active` | yes — `active` |
| | `test_name` | no — see gap 1 |
| | `issue_title` | yes — `issue` |

## 5. Endpoints the UI wants and the API does not have

- **`GET /issues/facets`** — facet counts over the whole filtered set. Without
  it `IssuesTable` counts the rows it holds and marks those counts page-local:
  a page cannot answer "how many closed issues are there".
- **`result_count` on `IssueSerializer`** — the issues list has a column for it
  and leaves it blank. `rule_count` and `active_rule_count` are annotated;
  this one is not.

## 6. Shapes worth knowing

Not gaps, but places where the obvious reading of the API is wrong.

- **`has_error` is already suppressed.** `is_result_unexpected()` returns
  `False` as soon as a suppressing stamp exists, so a held-back failure is
  indistinguishable from a pass that carries a stamp. `effective_expected` is
  the field that tells them apart, and `resultClassification()` needs it to
  reach the `suppressed` verdict at all.
- **Both classified-result listings answer with an envelope.**
  `/runs/{id}/issues/{issueId}/results/` and `/results/?issue={id}` return
  `{ results: [...] }` of `generate_results_details` rows — which name the test
  but carry **no package path**, and whose `obtained_result` is
  `{ result_type, verdicts }`, not a string.
- **`/results/?issue=` is comma-separated**, not `;` — it is parsed by
  `ResultService.list_results`, not by the `QUERY_DELIMITER` convention the
  issue endpoints follow.
- **The classify `matcher` takes values, not flags.** `ResultViewSet.classify`
  reads `matcher.get('parameters' | 'verdicts' | 'tags')` with a default drawn
  from the result, so an absent key captures, a present-but-empty one ignores,
  and `match_*` booleans are read by nothing.
