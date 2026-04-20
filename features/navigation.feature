Feature: Navigation
  Scenario: Navigate from the menu to Location and back
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    Then I should see the Location page
    When I go back to Dashboard using the menu
    Then I should see the Dashboard page

  Scenario: Navigate from Location to a surface detail page and return
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    Then I should see the Location page
    When I open the first surface detail from the menu
    Then I should see the Surface detail page
    When I go back to Location using the breadcrumb
    Then I should see the Location page
    When I open the first surface detail from the page
    Then I should see the Surface detail page
    When I go back to Dashboard using the breadcrumb
    Then I should see the Dashboard page

  Scenario: Navigate from the menu to Catalogs and back
    Given OffGridOS is rendered with project data
    When I open Catalogs from the menu
    Then I should see the Catalogs page
    When I open Panel types from Catalogs
    Then I should see the Panel types page
    When I go back to Catalogs using the menu
    Then I should see the Catalogs page
    When I go back to Dashboard using the menu
    Then I should see the Dashboard page

  Scenario: Navigate from the menu to Battery array and back
    Given OffGridOS is rendered with project data
    When I open Battery array from the menu
    Then I should see the Battery array page
    When I go back to Dashboard using the menu
    Then I should see the Dashboard page

  Scenario: Navigate from the menu to Inverter array and back
    Given OffGridOS is rendered with project data
    When I open Inverter array from the menu
    Then I should see the Inverter array page
    When I go back to Dashboard using the menu
    Then I should see the Dashboard page
