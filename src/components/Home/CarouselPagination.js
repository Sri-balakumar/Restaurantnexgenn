import { View, StyleSheet, Dimensions, Image } from 'react-native'
import React, { useState } from 'react'
import Carousel, { Pagination } from 'react-native-snap-carousel';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CarouselPagination = () => {
    const [activeSlide, setActiveSlide] = useState(0);
    const data = [
        { image: require('@assets/images/Home/Banner/banner_phone_1.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_2.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_3.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_4.png') },
        { image: require('@assets/images/Home/Banner/banner_phone_5.png') }
    ];
    const carouselMargin = 8;

    return (
        <View>
            <Carousel
                data={data}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Image source={item.image} style={styles.image} />
                    </View>
                )}
                sliderWidth={screenWidth - 2 * carouselMargin}
                itemWidth={screenWidth - 2 * carouselMargin}
                autoplay={true}
                loop={true}
                autoplayDelay={500}
                autoplayInterval={3000}
                enableMomentum={false}
                lockScrollWhileSnapping={true}
                containerCustomStyle={styles.carouselContainer}
                onSnapToItem={(index) => setActiveSlide(index)}
            />
            <View style={styles.paginationContainer}>
                <Pagination
                    dotsLength={data.length}
                    activeDotIndex={activeSlide}
                    containerStyle={styles.paginationDotsContainer}
                    dotStyle={styles.paginationDot}
                    inactiveDotOpacity={0.4}
                    inactiveDotScale={0.6}
                />
            </View>
        </View>
    )
}

export default CarouselPagination

const styles = StyleSheet.create({
    image: {
        width: '100%',
        height: screenHeight * 0.20,
        borderRadius: 5,
        borderWidth: 1,
        // resizeMode: 'contain'
    },
    carouselContainer: {
        marginHorizontal: 8,
        marginVertical: 20
    },
    paginationContainer: {
        position: 'absolute',
        top: screenHeight * 0.16,
        width: '100%',
        alignItems: 'center',
    },
    paginationDotsContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
    },
    paginationDot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 6,
        backgroundColor: '#5D5FEE',
    },
});
