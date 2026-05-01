Feature: Navigation
  Scenario: Location is the landing page
    Given OffGridOS is rendered with project data
    Then I should see the Location page

  Scenario: Navigate from Location to a surface detail page and return
    Given OffGridOS is rendered with project data
    When I open Production from the menu
    And I open the first surface detail from the menu
    Then I should see the Surface detail page
    When I go back to Production using the breadcrumb
    Then I should see the Production page
    When I open the first surface detail from the page
    Then I should see the Surface detail page
    When I go back to Production using the breadcrumb
    Then I should see the Production page

  Scenario: Delete a surface from the detail page and return to Location
    Given OffGridOS is rendered with project data
    When I open Production from the menu
    And I open the first surface detail from the menu
    And I delete the active surface from the detail page
    Then I should see the Location page

  Scenario: Navigate from the menu to Catalogs and back to Location
    Given OffGridOS is rendered with project data
    When I open Catalogs from the menu
    Then I should see the Catalogs page
    When I open Panel types from Catalogs
    Then I should see the Panel types page
    When I go back to Catalogs using the menu
    Then I should see the Catalogs page
    When I go back to Location using the menu
    Then I should see the Location page

  Scenario: Navigate from the menu to Battery array and back to Location
    Given OffGridOS is rendered with project data
    When I open Battery array from the menu
    Then I should see the Battery array page
    When I go back to Location using the menu
    Then I should see the Location page

  Scenario: Navigate from the menu to Production and back to Location
    Given OffGridOS is rendered with project data
    When I open Production from the menu
    Then I should see the Production page
    When I go back to Location using the menu
    Then I should see the Location page

  Scenario: Navigate from the menu to Consumption and back to Location
    Given OffGridOS is rendered with project data
    When I open Consumption from the menu
    Then I should see the Consumption page
    When I go back to Location using the menu
    Then I should see the Location page

  Scenario: Load circuits page renders directly
    Given OffGridOS is rendered on the load circuits page
    Then I should see the Load circuits page

  Scenario: Loads page renders directly
    Given OffGridOS is rendered on the loads page
    Then I should see the Loads page

  Scenario: Open filtered load circuits from Consumption
    Given OffGridOS is rendered with project data
    When I open Consumption from the menu
    And I add a converter on the Consumption page
    And I choose the last converter on the Consumption page
    And I title the last converter "Galley inverter" on the Consumption page
    And I save the converter on the Consumption page
    And I open the first converter detail from the page
    Then I should see the Load circuits page
    And the load circuits page should be filtered to the selected converter
    And the load circuits page should show the selected converter title
