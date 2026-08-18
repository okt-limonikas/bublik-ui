# SPDX-License-Identifier: Apache-2.0
# SPDX-FileCopyrightText: 2024-2026 OKTET LTD
#
# Implemented by apps/bublik/e2e/dashboard.spec.ts — see features/README.md.

Feature: Dashboard

  As an engineer watching the test lab, I open the dashboard to see what ran on a
  given day, spot the runs with unexpected results, and get from a NOK counter to
  the failing tests in one click. The dashboard is public: it needs no sign-in.

  @dashboard @smoke
  Scenario: Dashboard lists the runs imported for a date
    Given a run was imported for a day
    When I open the dashboard for that day
    Then the run appears as a row in the dashboard table
    And the row shows its conclusion, total and NOK counters

  @dashboard
  Scenario: Dashboard shows an empty state for a date without runs
    Given a day with no imported runs
    When I open the dashboard for that day
    Then the dashboard shows the "No data" empty state
    And none of the imported runs are listed

  @dashboard @needs-nok
  Scenario: NOK counter reports the number of unexpected results
    Given an imported run has unexpected results
    When I open the dashboard for that run's day
    Then the run's NOK counter equals the number of unexpected results

  @dashboard @needs-nok
  Scenario: Clicking the NOK counter opens the run with unexpected rows previewed
    Given an imported run has unexpected results
    When I open the dashboard for that run's day
    And I click the run's NOK counter
    Then the run page for that run is open
    And the packages containing unexpected results are expanded
    And the tests with unexpected results are listed
    But no result table is expanded yet

  @dashboard @needs-nok
  Scenario: Ctrl-clicking the NOK counter opens the run with the result tables expanded
    Given an imported run has unexpected results
    When I open the dashboard for that run's day
    And I ctrl-click the run's NOK counter
    Then the run page for that run is open
    And the result table of a test with unexpected results is expanded

  # Which page a counter opens is deployment configuration (the backend attaches
  # a handler per column), so the scenario checks the mapping, not one layout.
  @dashboard
  Scenario: Clicking the total counter follows the destination the dashboard declares
    Given the dashboard declares where the run's total counter leads
    When I open the dashboard for that day
    And I click the run's total counter
    Then that declared destination is open

  @dashboard
  Scenario: Expanding a dashboard row reveals the run's pass rate history
    Given a run was imported for a day
    When I open the dashboard for that day
    And I expand the run's row
    Then the row's pass rate history is shown
    When I collapse the run's row
    Then the row's pass rate history is hidden

  @dashboard
  Scenario: Searching the dashboard narrows the table to matching runs
    Given a run was imported for a day
    When I open the dashboard for that day
    And I search for a term that no run matches
    Then the run is no longer listed
    When I clear the search
    Then the run is listed again

  @dashboard
  Scenario: Switching the layout mode shows two days side by side
    Given a run was imported for a day
    When I open the dashboard for that day
    And I switch the layout to two days per column
    Then the dashboard URL records the columns mode
    And the run is still listed

  @dashboard
  Scenario: The Today button returns the dashboard to the current day
    Given a run was imported for a day
    When I open the dashboard for that day
    And I press the Today button
    Then the dashboard URL no longer pins a date

  # "Today" is the latest day the backend has runs for, and that is resolved per
  # project — so with a project selected it lands on that project's latest runs.
  @dashboard
  Scenario: The Today button opens the latest day of the selected project
    Given a project whose runs span more than one day
    When I open the dashboard for that project on an older day
    And I press the Today button
    Then the dashboard shows that project's latest day
    And the runs of that latest day are listed
    But the older day's run is not listed

  @dashboard
  Scenario: Refreshing the dashboard refetches the day's runs
    Given a run was imported for a day
    When I open the dashboard for that day
    And I press the refresh button
    Then the dashboard fetches the day's runs again
    And the run is still listed

  @dashboard
  Scenario: Auto reload refreshes the dashboard on a timer
    Given a run was imported for a day
    When I open the dashboard for that day
    And I turn on Auto reload
    Then the dashboard reloads the day's runs on its own
    When I turn off Auto reload
    Then Auto reload is off

  @dashboard
  Scenario: TV mode shows the dashboard full screen until Escape
    Given a run was imported for a day
    When I open the dashboard for that day
    And I enter TV mode
    Then the dashboard fills the screen without the page controls
    And the run is listed on the TV screen
    When I press Escape
    Then TV mode is closed and the dashboard controls are back

  @dashboard
  Scenario: Selecting a project in the sidebar scopes the dashboard to it
    Given two runs of different projects were imported for the same day
    When I open the dashboard for that day
    Then both runs are listed
    When I select the first run's project in the sidebar
    Then only that project's run is listed
    And the sidebar shows the project as selected
    When I select All projects in the sidebar
    Then both runs are listed again
