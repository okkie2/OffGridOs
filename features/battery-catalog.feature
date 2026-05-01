Feature: Battery catalog
  Scenario: Add a battery and cancel
    Given OffGridOS is rendered with project data
    When I open Catalogs from the menu
    And I open Batteries from Catalogs
    And I add a battery type
    Then the battery draft row should be at the top of the table
    And I fill in the battery type form with model "BDD Cancel Battery"
    And I press Cancel in the battery editor
    Then I should see the Batteries page
    And the battery type with model "BDD Cancel Battery" should not exist

  Scenario: Save a battery
    Given OffGridOS is rendered with project data
    When I open Catalogs from the menu
    And I open Batteries from Catalogs
    And I add a battery type
    Then the battery draft row should be at the top of the table
    And I fill in the battery type form with model "BDD Save Battery"
    And I press Save in the battery editor
    Then the battery type with model "BDD Save Battery" should exist

  Scenario: Delete a battery
    Given OffGridOS is rendered with project data
    When I open Catalogs from the menu
    And I open Batteries from Catalogs
    And I add a battery type
    Then the battery draft row should be at the top of the table
    And I fill in the battery type form with model "BDD Delete Battery"
    And I press Save in the battery editor
    When I open the battery row with model "BDD Delete Battery"
    And I press Edit battery
    And I press Delete in the battery editor
    Then I should see the battery delete warning
    And I confirm the battery delete warning
    Then the battery type with model "BDD Delete Battery" should not exist
