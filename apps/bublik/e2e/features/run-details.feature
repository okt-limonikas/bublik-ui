# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2024-2026 OKTET LTD
#
# Implemented by apps/bublik/e2e/run-details.spec.ts — see features/README.md.

Feature: Run details

  As an engineer investigating a test session, I open a run to read its metadata,
  walk the package/test tree, open the result table of an individual test, and
  jump from a result to its log, history or measurements.

  Background:
    Given I am signed in

  @smoke
  Scenario: Run details show the metadata recorded in the manifest
    Given the fixture manifest describes an imported run
    When I open that run's page
    Then the info card shows the run id
    And the info card shows the conclusion

  Scenario: Exposing the run info reveals the full detail set
    Given I open an imported run's page
    When I expose the full run info
    Then the info card also shows the run status and duration

  Scenario: Expanding a package reveals the tests it contains
    Given I open an imported run's page
    When I expand the first collapsed package of the tree
    Then more rows are shown than before

  @needs-nok
  Scenario: Open NOK expands the result tables of the unexpected results
    Given I open a run that has unexpected results
    When I press Open NOK
    Then at least one result table is expanded
    When I press Reset
    Then no result table is expanded

  @needs-nok
  Scenario: Preview NOK expands the tree without opening result tables
    Given I open a run that has unexpected results
    When I press Preview NOK
    Then the tests with unexpected results are listed
    And no result table is expanded

  Scenario: Clicking a count badge opens that test's result table
    Given I open an imported run's page and expand the tree down to a test
    When I click a count badge of that test row
    Then that test's result table is expanded

  Scenario: The run header opens the log of the whole run
    Given I open an imported run's page
    When I follow the header's Log link
    Then the log page for that run is open

  Scenario: A result row links to the log of that result
    Given I open an imported run's page with a result table expanded
    When I follow the result's Log link
    Then the log page opens focused on that result

  Scenario: The compare form rejects a value that is not a run
    Given I open an imported run's page
    When I open the compare form and submit an invalid run reference
    Then the form reports that the value is not a valid URL or run id

  @needs-report
  Scenario: The reports menu lists the configured report
    Given I open a run whose project has a report config
    When I open the reports menu
    Then the configured report is offered

  @run @comments
  Scenario: A run comment can be added and then removed
    Given I open an imported run's page with no comment
    When I add a comment to the run
    Then the info card shows that comment
    When I remove the run comment
    Then the info card shows no comment

  # Notes are hidden by default, so the column has to be switched on first.
  @run @comments
  Scenario: A note can be added to a test node and then removed
    Given I open an imported run's page with the Notes column shown
    When I add a note to a test node
    Then that test node shows the note
    When I delete the note
    Then that test node has no note

  @run @runs @dashboard @compromised
  Scenario: Marking a run as compromised marks it on the run, runs and dashboard pages
    Given I open a run that is not compromised
    When I mark the run as compromised
    Then the run page reports the run as compromised
    And the run's conclusion is compromised
    When I open the runs page filtered to that run
    Then the runs row reports the run as compromised
    When I open the dashboard for that run's date
    Then the dashboard row reports the run as compromised
    When I remove the compromised status from the run
    Then the run page no longer reports the run as compromised

  @run @compromised
  Scenario: The compromise form requires a comment
    Given I open a run that is not compromised
    When I submit the compromise form without a comment
    Then the form reports that a comment is required

  @run @history
  Scenario: The History link opens the history for the test path, parameters and important tags
    Given I open an imported run's page with a result table expanded
    When I follow the result's History link
    Then the history page opens filtered by that test path
    And the history query carries the result parameters and the run's important tags

  # The first column names the scenario; the second is the menu item it drives.
  @run @history @needs-nok
  Scenario Outline: The result history menu filters the history by the chosen variant
    Given I open a run with unexpected results and a result table expanded
    When I choose the given variant from the result history menu
    Then the history query carries the parameters of that variant

    Examples:
      | variant                        | menu item                         |
      | Path only                      | Test Path                         |
      | Path and verdicts              | Test Path + Verdicts              |
      | Path and parameters            | Test Path + Parameters            |
      | Path, parameters and all tags  | Test Path + Parameters + All Tags |

  @run @history
  Scenario: A prefilled history link opens the global search form with the query prefilled
    Given I open an imported run's page with a result table expanded
    When I choose a prefilled variant from the result history menu
    Then the global search form opens with that test path prefilled

  @run @history
  Scenario: The test node history link opens the history scoped to that run
    Given I open an imported run's page and expand the tree down to a test node
    When I open the history view of that test node
    Then the history query is scoped to that run and test path
