Feature: Location media and notes persistence
  Scenario: Upload, save, and reload the location photo
    Given OffGridOS is rendered with project data
    When I open Location from the menu
    And I enter location notes "First test notes"
    And I save the location information
    And I upload a location photo
    And I save the location photo
    Then the location should persist notes "First test notes" with a stored photo
    When I reload OffGridOS
    Then I should see the Location page
    And the location photo should still be visible
    And the location notes should still be visible
