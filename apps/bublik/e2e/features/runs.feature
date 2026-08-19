# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2024-2026 OKTET LTD
#
# Implemented by apps/bublik/e2e/runs-page.spec.ts — see features/README.md.

Feature: Runs

  As an engineer looking for a particular test session, I filter the runs list by
  date, metadata and tag expressions, read each run's OK/NOK summary, and go from
  there to a run, its log, or a comparison of several runs.

  Background:
    Given I am signed in

  @smoke
  Scenario: Runs table lists a run matching a tag expression
    Given the fixture manifest describes an imported run
    When I open the runs page filtered by that run's fixture tag
    Then the runs table lists that run

  Scenario: The Run link opens the run details page
    Given the runs table lists a run
    When I follow the row's Run link
    Then the run details page is open

  Scenario: The Log link opens the log page
    Given the runs table lists a run
    When I follow the row's Log link
    Then the log page for that run is open

  Scenario: Sorting by statistic summary keeps the run listed
    Given the runs table lists a run
    When I sort the table by statistic summary
    Then the table is still healthy and the run is listed

  @needs-nok
  Scenario: The NOK summary badge reports the unexpected result count
    Given the fixture manifest describes a run with unexpected results
    When I open the runs page filtered by that run's fixture tag
    Then the row's NOK badge shows the unexpected result count from the manifest

  @needs-nok
  Scenario: Clicking the NOK badge opens the run with unexpected rows previewed
    Given the fixture manifest describes a run with unexpected results
    When I open the runs page filtered by that run's fixture tag
    And I click the row's NOK badge
    Then the run page for that run is open
    And the tests with unexpected results are listed on the run page

  Scenario: Applying a tag expression writes it to the URL
    Given I open the runs page for a date covered by the fixtures
    When I type a tag expression and submit the form
    Then the tag expression is recorded in the URL

  Scenario: Resetting the form clears the filters from the URL
    Given I open the runs page with a date range and a tag expression
    When I reset the form
    Then the URL no longer carries the filters

  Scenario: A tag expression that matches nothing shows the empty state
    When I open the runs page filtered by a tag that no run carries
    Then the runs page shows the "No runs found" empty state

  Scenario: Selecting two runs offers comparison and multi-run views
    Given the fixture manifest describes two imported runs
    When I open the runs page covering both runs
    And I select both rows
    Then the selection popover reports two selected runs
    And it offers to open them in the multiple-runs view
    And it offers to compare them

  ###########################################
  #         Filtering by badge              #
  ###########################################

  # A tag, metadata or important-tag badge is not decoration: clicking one writes
  # `runData` into the URL and refetches, because `runs.autoApplyBadgeFilters` is
  # on by default. That makes the badge and the Metas field two spellings of the
  # same filter, and these scenarios pin them to each other. Which tag lands in
  # which column is the backend's decision, so the scenarios pick a badge that
  # only some of the listed runs carry rather than naming a fixture value.

  @runs @url-params
  Scenario: Clicking a run tag badge filters the runs table and records it in the URL
    Given the runs table lists the runs imported on a fixture date
    When I click a tag badge that only some of those runs carry
    Then that tag is recorded in the URL as run data
    And the URL is back on the first page
    And only the runs carrying that tag are listed
    And the badge is shown as selected

  @runs @url-params
  Scenario: Clicking the same run tag badge again clears the run data filter
    Given the runs table is filtered by a tag badge
    When I click that badge again
    Then the run data is dropped from the URL
    And the runs the badge had filtered out are listed again

  # The filter is an AND, so two badges of the same row can never empty the table
  # — which is what makes this a test of the joining rather than of the query.
  @runs @url-params
  Scenario: Clicking two badges of the same run combines both into the run data filter
    Given the runs table lists the runs imported on a fixture date
    When I click an important tag badge of a run
    And I click a metadata badge of the same run
    Then both values are recorded in the URL as run data
    And that run is still listed

  # Badges render `key: value` but filter, and travel, as `key=value`. A link is
  # read back into the form, so this is the round trip in the other direction.
  @runs @url-params
  Scenario: A run data filter in the link is reflected in the Metas field
    Given a link that pins a run data value the fixture runs carry
    When I open that link
    Then the Metas field reports that value as selected
    And only the runs carrying it are listed

  @runs @url-params
  Scenario: Selecting a meta in the Metas field filters the runs table on submit
    Given the runs table lists the runs imported on a fixture date
    When I select a meta in the Metas field and submit the form
    Then that meta is recorded in the URL as run data
    And only the runs carrying it are listed

  @runs
  Scenario: Resetting the form clears the run data applied by a badge
    Given the runs table is filtered by a tag badge
    When I reset the form
    Then the run data is dropped from the URL
    And the runs the badge had filtered out are listed again

  # The form writes its whole block on submit, so a badge filter the form did not
  # know about would be dropped here rather than kept.
  @runs @url-params
  Scenario: Submitting a tag expression keeps the run data applied by a badge
    Given the runs table is filtered by a tag badge
    When I type a tag expression and submit the form
    Then the URL carries both the tag expression and the run data

  Scenario Outline: The runs page renders every view mode
    When I open the runs page in the given mode
    Then the mode's own section is rendered

    Examples:
      | mode     |
      | charts   |
      | progress |
