Feature: Persistence field coverage
  Scenario: Save and reload the full location field set
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    And I set the location title to "Field coverage location"
    And I set the country to "Netherlands"
    And I set the location description to "Shared context for the whole site"
    And I set the latitude to "53.1504"
    And I set the longitude to "5.9007"
    And I enter location notes "Check winter shading later"
    And I save the location information
    And I upload a location photo
    And I save the location photo
    Then the location should persist the full field set
    When I reload OffGridOS
    Then I should see the Location page
    And the location photo should still be visible
    And the location notes should still be visible

  Scenario: Save and reload the full surface field set
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    And I open the first surface detail from the page
    And I set the surface name to "South-East roof"
    And I set the surface description to "Morning production surface"
    And I set the surface height to "4.2"
    And I set the surface width to "2.8"
    And I set the surface azimuth to "140"
    And I set the surface tilt to "35"
    And I enter surface notes "Install with chimney clearance"
    And I save the surface information
    And I upload a surface photo
    And I save the surface information
    Then the surface should persist the full field set
    When I reload OffGridOS
    And I open Location from the menu
    And I open the first surface detail from the page
    Then I should see the Surface detail page

  Scenario: Save panel setup and matching surface configuration
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    And I open the first surface detail from the page
    And I choose the last panel type
    And I set the panel count to "12"
    And I save the panel setup
    When I reload OffGridOS
    And I open Location from the menu
    And I open the first surface detail from the page
    And I set the panels per string to "3"
    And I set the parallel strings to "4"
    And I choose the last MPPT type
    And I save the surface configuration
    Then the surface panel setup should persist
    And the surface configuration should persist
    When I reload OffGridOS
    And I open Location from the menu
    And I open the first surface detail from the page
    Then the surface panel setup should persist
    And the surface configuration should persist

  Scenario: Reject a mismatched surface configuration
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    And I open the first surface detail from the page
    And I choose the last panel type
    And I set the panel count to "12"
    And I save the panel setup
    When I reload OffGridOS
    And I open Location from the menu
    And I open the first surface detail from the page
    And I set the panels per string to "5"
    And I set the parallel strings to "2"
    And I choose the last MPPT type
    And I attempt to save the surface configuration
    Then I should see the surface configuration error "Saved string layout must match the persisted panel count for this face (12)."

  Scenario: Save and reload the inverter configuration title and description
    Given OffGridOS is rendered with project data
    When I open Inverter array from the menu
    And I set the inverter title to "Main inverter"
    And I set the inverter description to "Primary AC conversion unit"
    And I choose the last inverter type
    And I save the inverter configuration
    Then the inverter configuration should persist
    When I reload OffGridOS
    And I open Inverter array from the menu
    Then the inverter configuration should persist
    And the inverter configuration form should still show the saved values

  Scenario: Save and reload the inverter configuration notes
    Given OffGridOS is rendered with project data
    When I open Inverter array from the menu
    And I set the inverter notes to "Primary AC conversion unit and notes test"
    And I choose the last inverter type
    And I save the inverter configuration
    Then the inverter notes should persist
    When I reload OffGridOS
    And I open Inverter array from the menu
    Then the inverter notes should persist
    And the inverter notes should still be visible

  Scenario: Save and reload the inverter configuration image
    Given OffGridOS is rendered with project data
    When I open Inverter array from the menu
    And I choose the last inverter type
    And I upload an inverter image
    Then the inverter image should persist
    When I reload OffGridOS
    And I open Inverter array from the menu
    Then the inverter image should still be visible

  Scenario: Save and reload the full load circuit field set
    Given a movable load setup exists for the loads page
    And OffGridOS is rendered on the load circuits page
    And I add a load circuit on the Load circuits page
    And I title the last load circuit "Living room circuit" on the Load circuits page
    And I set the load circuit description to "Socket and lighting loads in the living room"
    And I save the load circuit on the Load circuits page
    Then the load circuit should persist the full field set
    When I reload OffGridOS
    Then the load circuit should persist the full field set

  Scenario: Save and reload the full load field set
    Given a movable load setup exists for the loads page
    And OffGridOS is rendered on the movable load source circuit
    And I create the full load field set on the page
    Then the load should persist the full field set
    When I reload OffGridOS
    Then the load should persist the full field set

  Scenario: Save and reload the battery bank configuration title and description
    Given OffGridOS is rendered with project data
    When I open Battery array from the menu
    And I set the battery title to "Main battery bank"
    And I set the battery description to "Primary storage unit"
    And I choose the last battery type
    And I save the battery bank configuration
    Then the battery bank configuration should persist
    When I reload OffGridOS
    And I open Battery array from the menu
    Then the battery bank configuration should persist
    And the battery bank configuration form should still show the saved values

  Scenario: Save and reload the battery bank configuration notes
    Given OffGridOS is rendered with project data
    When I open Battery array from the menu
    And I set the battery notes to "Check battery ventilation requirements"
    And I choose the last battery type
    And I save the battery bank configuration
    Then the battery bank notes should persist
    When I reload OffGridOS
    And I open Battery array from the menu
    Then the battery bank notes should persist
    And the battery bank notes should still be visible

  Scenario: Save and reload the battery bank configuration image
    Given OffGridOS is rendered with project data
    When I open Battery array from the menu
    And I upload a battery image
    Then the battery bank image should persist
    When I reload OffGridOS
    And I open Battery array from the menu
    Then the battery bank image should still be visible
