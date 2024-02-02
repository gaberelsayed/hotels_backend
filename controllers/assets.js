const moment = require("moment");

const confirmationEmail = (reservationData) => {
	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Reservation</h1>
            </div>
            <div>
                <h2>${reservationData.hotelName.toUpperCase()} Hotel</h2>
            </div>
            <div class="content">
            <p class="confirmation"><strong>Confirmation Number:</strong> ${
							reservationData.confirmation_number
						}</p>
                <p><strong>Guest Name:</strong> ${
									reservationData.customer_details.name
								}</p>
              
                                <p><strong>Reservation Status:</strong> ${
																	reservationData.reservation_status
																}</p>
                <p><strong>Country:</strong> ${
									reservationData.customer_details.nationality
								}</p>
                <table>
                    <tr>
                        <th>Room Type</th>
                        <td class="roomType">${reservationData.pickedRoomsType
													.map((room) => room.room_type)
													.join(", ")}</td>
                    </tr>
                   
                    <tr>
                    <th>Room Count</th>
                    <td class="roomType">${reservationData.pickedRoomsType.reduce(
											(sum, item) => sum + (item.count || 0),
											0
										)}</td>
                    </tr>
                    
                    <tr>
                    <th>Check-in Date</th>
                    <td>${moment(reservationData.checkin_date).format(
											"dddd, MMMM Do YYYY"
										)}</td>
                </tr>
                <tr>
                    <th>Check-out Date</th>
                    <td>${moment(reservationData.checkout_date).format(
											"dddd, MMMM Do YYYY"
										)}</td>
                </tr>
                    <tr>
                    <th>Nights Of Residence</th>
                    <td>${reservationData.days_of_residence} Nights</td>
                </tr>
                    <tr>
                        <th>Guest Count</th>
                        <td>${reservationData.total_guests}</td>
                    </tr>
                    <tr>
                        <th>Order Total</th>
                        <td>${reservationData.total_amount.toLocaleString()} SAR</td>
                    </tr>
                </table>
                <p><strong>Booking Date:</strong> ${new Date(
									reservationData.booked_at
								).toDateString()}</p>
            </div>
            <div class="footer">
                <p>Thank you for booking with us!</p>
            </div>
        </div>
    </body>
    </html>
`;

	return email;
};

const reservationUpdate = (reservationData, hotelName) => {
	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation Update</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <h1>Reservation Update</h1>
        </div>
        <div>
            <h2>${hotelName.toUpperCase()} Hotel</h2>
        </div>
        <div class="content">
        <p class="confirmation"><strong>Confirmation Number:</strong> ${
					reservationData.confirmation_number
				}</p>
            <p><strong>Guest Name:</strong> ${
							reservationData.customer_details.name
						}</p>
          
                        <p><strong>Reservation Status:</strong> ${
													reservationData.reservation_status
												}</p>
            <p><strong>Country:</strong> ${
							reservationData.customer_details.nationality
						}</p>
            <table>
                <tr>
                    <th>Room Type</th>
                    <td class="roomType">${reservationData.pickedRoomsType
											.map((room) => room.room_type)
											.join(", ")}</td>
                </tr>
               
                <tr>
                <th>Room Count</th>
                <td class="roomType">${reservationData.pickedRoomsType.reduce(
									(sum, item) => sum + (item.count || 0),
									0
								)}</td>
                </tr>
                
                <tr>
                <th>Check-in Date</th>
                <td>${moment(reservationData.checkin_date).format(
									"dddd, MMMM Do YYYY"
								)}</td>
            </tr>
            <tr>
                <th>Check-out Date</th>
                <td>${moment(reservationData.checkout_date).format(
									"dddd, MMMM Do YYYY"
								)}</td>
            </tr>
                <tr>
                <th>Nights Of Residence</th>
                <td>${reservationData.days_of_residence} Nights</td>
            </tr>
                <tr>
                    <th>Guest Count</th>
                    <td>${reservationData.total_guests}</td>
                </tr>
                <tr>
                    <th>Order Total</th>
                    <td>${reservationData.total_amount.toLocaleString()} SAR</td>
                </tr>
            </table>
            <p><strong>Booking Date:</strong> ${new Date(
							reservationData.booked_at
						).toDateString()}</p>
        </div>
        <div class="footer">
            <p>Thank you for booking with us!</p>
        </div>
    </div>
</body>
    </html>
`;

	return email;
};

module.exports = { confirmationEmail, reservationUpdate };
